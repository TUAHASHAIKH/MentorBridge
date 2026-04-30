import { NextResponse } from 'next/server'
import { getBearerToken } from '@/lib/mentor-auth'
import { getProfileFromToken } from '@/lib/user-auth'
import { getSupabaseServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request, context) {
  const profile = await getProfileFromToken(getBearerToken(request))
  if (!profile) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await context.params

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { rating, feedback } = body
  const ratingInt = Number(rating)
  if (!Number.isInteger(ratingInt) || ratingInt < 1 || ratingInt > 5) {
    return NextResponse.json({ error: 'Rating must be an integer from 1 to 5.' }, { status: 400 })
  }

  const supabase = getSupabaseServiceRoleClient()

  const { data: session } = await supabase
    .from('sessions')
    .select('id, status, mentor_id, student_id')
    .eq('id', id)
    .eq('student_id', profile.id)
    .maybeSingle()

  if (!session) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  }
  if (session.status !== 'completed') {
    return NextResponse.json({ error: 'Only completed sessions can be rated.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('session_reviews')
    .select('id')
    .eq('session_id', id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This session has already been reviewed.' }, { status: 409 })
  }

  const { error: insertError } = await supabase
    .from('session_reviews')
    .insert({ session_id: id, reviewer_id: profile.id, rating: ratingInt, feedback: feedback?.trim() || null })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Recalculate avg_rating from all reviews across this mentor's sessions
  const { data: mentorSessions } = await supabase
    .from('sessions')
    .select('id')
    .eq('mentor_id', session.mentor_id)

  const sessionIds = (mentorSessions || []).map((s) => s.id)

  if (sessionIds.length > 0) {
    const { data: allReviews } = await supabase
      .from('session_reviews')
      .select('rating')
      .in('session_id', sessionIds)

    if (allReviews && allReviews.length > 0) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      await supabase
        .from('mentor_profiles')
        .update({ avg_rating: Math.round(avg * 10) / 10 })
        .eq('id', session.mentor_id)
    }
  }

  return NextResponse.json({ success: true })
}

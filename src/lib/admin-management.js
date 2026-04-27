import { getSupabaseServiceRoleClient } from './supabase-server'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function isUserAlreadyExistsError(message) {
  const text = String(message || '').toLowerCase()
  return text.includes('already') && text.includes('user')
}

async function findAuthUserByEmail(supabase, email) {
  const normalizedEmail = normalizeEmail(email)

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    })

    if (error) {
      throw error
    }

    const users = data?.users || []
    const matched = users.find((user) => normalizeEmail(user.email) === normalizedEmail)
    if (matched) {
      return matched
    }

    if (users.length < 200) {
      break
    }
  }

  return null
}

async function upsertAdminProfile(supabase, { userId, email, fullName }) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email: normalizeEmail(email),
      full_name: fullName || null,
      role: 'admin',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    throw error
  }
}

function isMissingAuditLogTable(error) {
  return error?.code === '42P01' || String(error?.message || '').toLowerCase().includes('admin_audit_logs')
}

async function insertAdminAuditLog(supabase, { actorAdminId, action, targetUserId, targetEmail }) {
  const { error } = await supabase.from('admin_audit_logs').insert({
    actor_admin_id: actorAdminId,
    action,
    target_user_id: targetUserId,
    target_email: normalizeEmail(targetEmail),
    created_at: new Date().toISOString(),
  })

  if (!error) {
    return
  }

  // Keep admin management functional even if audit table is not created yet.
  if (isMissingAuditLogTable(error)) {
    return
  }

  throw error
}

export async function createOrPromoteAdminUser({
  actorAdminId,
  email,
  password,
  fullName,
  resetPassword = false,
}) {
  const supabase = getSupabaseServiceRoleClient()
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.')
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingProfileError) {
    throw existingProfileError
  }

  if (existingProfile) {
    const updates = { role: 'admin' }
    if (fullName) {
      updates.full_name = fullName
    }

    const { error: promoteError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', existingProfile.id)

    if (promoteError) {
      throw promoteError
    }

    if (resetPassword) {
      const { error: resetError } = await supabase.auth.admin.updateUserById(existingProfile.id, {
        password,
      })

      if (resetError) {
        throw resetError
      }
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId,
      action: 'promote_existing_user_to_admin',
      targetUserId: existingProfile.id,
      targetEmail: normalizedEmail,
    })

    return {
      mode: 'promoted_existing_user',
      userId: existingProfile.id,
      email: normalizedEmail,
    }
  }

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || null,
    },
  })

  if (createError) {
    if (!isUserAlreadyExistsError(createError.message)) {
      throw createError
    }

    const matchedAuthUser = await findAuthUserByEmail(supabase, normalizedEmail)
    if (!matchedAuthUser?.id) {
      throw createError
    }

    await upsertAdminProfile(supabase, {
      userId: matchedAuthUser.id,
      email: normalizedEmail,
      fullName,
    })

    if (resetPassword) {
      const { error: resetError } = await supabase.auth.admin.updateUserById(matchedAuthUser.id, {
        password,
      })

      if (resetError) {
        throw resetError
      }
    }

    await insertAdminAuditLog(supabase, {
      actorAdminId,
      action: 'promote_auth_user_to_admin',
      targetUserId: matchedAuthUser.id,
      targetEmail: normalizedEmail,
    })

    return {
      mode: 'promoted_existing_user',
      userId: matchedAuthUser.id,
      email: normalizedEmail,
    }
  }

  if (!createData?.user?.id) {
    throw new Error('Could not create admin user.')
  }

  await upsertAdminProfile(supabase, {
    userId: createData.user.id,
    email: normalizedEmail,
    fullName,
  })

  await insertAdminAuditLog(supabase, {
    actorAdminId,
    action: 'create_admin_user',
    targetUserId: createData.user.id,
    targetEmail: normalizedEmail,
  })

  return {
    mode: 'created_new_user',
    userId: createData.user.id,
    email: normalizedEmail,
  }
}

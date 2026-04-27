import process from 'process'

import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv

function printUsage() {
  console.log('Usage: npm run seed:admin -- --email admin@example.com --password "StrongPass123!" [--name "Admin Name"] [--reset-password]')
}

function parseArgs(argv) {
  const args = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (!arg.startsWith('--')) {
      continue
    }

    const key = arg.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }

    args[key] = next
    index += 1
  }

  return args
}

function getRequiredEnv(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function isUserAlreadyExistsError(message) {
  const value = (message || '').toLowerCase()
  return value.includes('already') && value.includes('user')
}

async function createOrPromoteAdmin({ email, password, fullName, resetPassword }) {
  const supabase = createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const normalizedEmail = email.trim().toLowerCase()

  const { data: existingProfile, error: profileReadError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (profileReadError) {
    throw profileReadError
  }

  if (existingProfile) {
    const updates = { role: 'admin' }
    if (fullName) {
      updates.full_name = fullName
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', existingProfile.id)

    if (profileUpdateError) {
      throw profileUpdateError
    }

    if (resetPassword) {
      const { error: passwordResetError } = await supabase.auth.admin.updateUserById(
        existingProfile.id,
        { password }
      )

      if (passwordResetError) {
        throw passwordResetError
      }
    }

    return {
      mode: 'promoted_existing_user',
      userId: existingProfile.id,
      email: normalizedEmail,
    }
  }

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName || null,
    },
  })

  if (createUserError) {
    if (!isUserAlreadyExistsError(createUserError.message)) {
      throw createUserError
    }

    const { data: nowExistingProfile, error: nowProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (nowProfileError || !nowExistingProfile) {
      throw nowProfileError || new Error('User exists in auth but profile not found.')
    }

    const profileUpdate = { role: 'admin' }
    if (fullName) {
      profileUpdate.full_name = fullName
    }

    const { error: promoteError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', nowExistingProfile.id)

    if (promoteError) {
      throw promoteError
    }

    if (resetPassword) {
      const { error: resetError } = await supabase.auth.admin.updateUserById(nowExistingProfile.id, {
        password,
      })

      if (resetError) {
        throw resetError
      }
    }

    return {
      mode: 'promoted_existing_user',
      userId: nowExistingProfile.id,
      email: normalizedEmail,
    }
  }

  if (!createdUser?.user?.id) {
    throw new Error('Auth user creation failed: missing user id in response.')
  }

  const { error: profileUpsertError } = await supabase.from('profiles').upsert(
    {
      id: createdUser.user.id,
      email: normalizedEmail,
      full_name: fullName || null,
      role: 'admin',
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (profileUpsertError) {
    throw profileUpsertError
  }

  return {
    mode: 'created_new_user',
    userId: createdUser.user.id,
    email: normalizedEmail,
  }
}

async function main() {
  loadEnvConfig(process.cwd())

  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    printUsage()
    return
  }

  const email = String(args.email || '').trim()
  const password = String(args.password || '').trim()
  const fullName = args.name ? String(args.name).trim() : ''
  const resetPassword = Boolean(args['reset-password'])

  if (!email || !password) {
    printUsage()
    throw new Error('Both --email and --password are required.')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.')
  }

  const result = await createOrPromoteAdmin({
    email,
    password,
    fullName,
    resetPassword,
  })

  console.log('Admin seed completed successfully.')
  console.log(`Mode: ${result.mode}`)
  console.log(`Email: ${result.email}`)
  console.log(`User ID: ${result.userId}`)
}

main().catch((error) => {
  console.error('Admin seed failed:', error.message || error)
  process.exitCode = 1
})

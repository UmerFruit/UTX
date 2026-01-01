// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Delete account function")

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const createErrorResponse = (error: string, status = 500, details?: any) => {
  return new Response(
    JSON.stringify({ error, details }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  )
}

const deleteUserData = async (supabase: any, table: string, userId: string) => {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
  
  if (error) {
    console.error(`Error deleting ${table}:`, error)
    throw new Error(`Failed to delete ${table}: ${error.message}`)
  }
  console.log(`${table} deleted successfully`)
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return createErrorResponse('No authorization header', 401)
    }

    // Get the user from the JWT
    const token = authHeader.replaceAll('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return createErrorResponse('Invalid token', 401)
    }

    const userId = user.id

    console.log(`Starting account deletion for user: ${userId}`)

    // Delete all user data in the correct order (due to foreign key constraints)
    await deleteUserData(supabase, 'expenses', userId)
    await deleteUserData(supabase, 'income', userId)
    await deleteUserData(supabase, 'categories', userId)

    // Finally, delete the user account
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError)
      return createErrorResponse('Failed to delete user account')
    }

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return createErrorResponse(error.message || 'Internal server error')
  }
})

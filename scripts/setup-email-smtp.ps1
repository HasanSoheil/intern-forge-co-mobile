<#
Connects a custom SMTP provider to Supabase Auth and installs the branded
6-digit code email template (template editing is locked on the free tier
until custom SMTP is configured — this script does both in one shot).

Usage (Brevo example — smtp-relay.brevo.com / port 587):
  .\scripts\setup-email-smtp.ps1 `
    -SmtpUser "<brevo login email or SMTP login>" `
    -SmtpPass "<brevo SMTP key>" `
    -SenderEmail "<the sender address you verified in Brevo>"

Optional: -SmtpHost / -SmtpPort for a different provider (e.g. Gmail:
-SmtpHost smtp.gmail.com -SmtpUser you@gmail.com -SmtpPass <app password>).

Auth: uses $env:SUPABASE_ACCESS_TOKEN if set, otherwise reads the Supabase
CLI login token from Windows Credential Manager (run `supabase login` once).
#>
param(
  [Parameter(Mandatory = $true)][string]$SmtpUser,
  [Parameter(Mandatory = $true)][string]$SmtpPass,
  [Parameter(Mandatory = $true)][string]$SenderEmail,
  [string]$SmtpHost = "smtp-relay.brevo.com",
  [int]$SmtpPort = 587,
  [string]$SenderName = "CrewLink",
  [string]$ProjectRef = "oyzdmkorlaecsodakptr"
)

$ErrorActionPreference = "Stop"

# --- Resolve the Supabase management token -------------------------------
$token = $env:SUPABASE_ACCESS_TOKEN
if (-not $token) {
  $sig = @'
using System;
using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
}
'@
  if (-not ([System.Management.Automation.PSTypeName]'CredMan').Type) {
    Add-Type -TypeDefinition $sig
  }
  $ptr = [IntPtr]::Zero
  if (-not [CredMan]::CredRead("Supabase CLI:supabase", 1, 0, [ref]$ptr)) {
    throw "No Supabase token found. Run 'supabase login' or set SUPABASE_ACCESS_TOKEN."
  }
  $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
  $bytes = New-Object byte[] $cred.CredentialBlobSize
  [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
  [CredMan]::CredFree($ptr)
  $token = [System.Text.Encoding]::UTF8.GetString($bytes)
}

# --- The 6-digit code email ----------------------------------------------
$template = @'
<div style="background-color:#f4f5f7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Verify your email</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.6;">
      Welcome to CrewLink! Enter this code in the app to verify your account:
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;background:#eef2ff;color:#4338ca;font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 24px;border-radius:10px;">{{ .Token }}</span>
    </div>
    <p style="margin:0 0 4px;color:#6b7280;font-size:13px;line-height:1.6;">
      This code expires in 1 hour. If you didn't create a CrewLink account, you can safely ignore this email.
    </p>
  </div>
</div>
'@

$body = @{
  # Custom SMTP — unlocks template editing and removes the 2-emails/hour limit
  smtp_host        = $SmtpHost
  smtp_port        = "$SmtpPort"
  smtp_user        = $SmtpUser
  smtp_pass        = $SmtpPass
  smtp_admin_email = $SenderEmail
  smtp_sender_name = $SenderName
  # Default sender caps this at 2/hour; with our own SMTP we can raise it
  rate_limit_email_sent = 30
  # Signup verification: required, 6 digits, code-based email
  mailer_autoconfirm                    = $false
  mailer_otp_length                     = 6
  mailer_subjects_confirmation          = "Your CrewLink verification code"
  mailer_templates_confirmation_content = $template
} | ConvertTo-Json

Write-Host "Patching Supabase auth config for project $ProjectRef ..."
$res = Invoke-RestMethod -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/$ProjectRef/config/auth" `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body $body

Write-Host ""
Write-Host "Done. Current config:"
$res | Select-Object smtp_host, smtp_admin_email, smtp_sender_name, mailer_autoconfirm, mailer_otp_length, mailer_subjects_confirmation | Format-List
Write-Host "Sign up in the app with a fresh email to see the 6-digit code arrive."

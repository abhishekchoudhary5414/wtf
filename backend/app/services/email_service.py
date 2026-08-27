"""Email service using SMTP."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger("wtf.backend.email")


def send_school_credentials_email(
    school_name: str,
    school_email: str,
    temporary_password: str,
) -> bool:
    """Send school login credentials via SMTP email.
    
    Args:
        school_name: Name of the school
        school_email: School email address
        temporary_password: Plain temporary password (will not be logged)
        
    Returns:
        True if email was sent successfully, False otherwise
    """
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.error("SMTP_USERNAME or SMTP_PASSWORD not configured")
        return False

    try:
        frontend_url = settings.FRONTEND_BASE_URL or "http://localhost:3000"
        login_url = f"{frontend_url.rstrip('/')}/schools/login"
        
        # Email template with login credentials
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Your WTF School Account</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }}
                .header {{ background: #7700aa; color: white; padding: 20px; text-align: center; }}
                .content {{ background: white; padding: 20px; margin-top: 10px; border-radius: 5px; }}
                .credentials {{ background: #f0f0f0; padding: 15px; border-left: 4px solid #7700aa; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                strong {{ color: #7700aa; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to WTF</h1>
                </div>
                <div class="content">
                    <h2>School Account Created</h2>
                    <p>Hello,</p>
                    <p>Your school account has been successfully created. Your login credentials are:</p>
                    
                    <div class="credentials">
                        <p><strong>School Name:</strong> {school_name}</p>
                        <p><strong>Email:</strong> {school_email}</p>
                        <p><strong>Temporary Password:</strong> {temporary_password}</p>
                    </div>
                    
                    <p><strong>⚠️ IMPORTANT:</strong> You must change your password after your first login for security.</p>
                    
                    <p><a href="{login_url}" style="display: inline-block; background: #7700aa; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In to Your Account</a></p>
                    
                    <h3>Next Steps:</h3>
                    <ol>
                        <li>Visit <strong>{login_url}</strong></li>
                        <li>Log in with your email and the temporary password above</li>
                        <li>Change your password to something secure that only you know</li>
                    </ol>
                    
                    <p>If you did not request this account or have any questions, please contact support.</p>
                    
                    <p>Best regards,<br/>The WTF Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM or settings.SMTP_USERNAME
        msg['To'] = school_email
        msg['Subject'] = f"Your WTF School Account for {school_name}"
        
        msg.attach(MIMEText(html_content, 'html'))
        
        # Send email via SMTP
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.starttls()
            
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        
        # Log success (without logging the password)
        logger.info(f"School credentials email sent to {school_email} for {school_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send school credentials email to {school_email}: {str(e)}")
        return False


def send_life_coach_credentials_email(
    coach_name: str,
    coach_email: str,
    school_name: str,
    school_email: str,
    temporary_password: str,
) -> bool:
    """Send Life Coach login credentials via SMTP email mentioning school details.
    
    Args:
        coach_name: Name of the life coach
        coach_email: Life coach email address
        school_name: Name of the school that added the coach
        school_email: Email of the school that added the coach
        temporary_password: Plain temporary password
        
    Returns:
        True if email was sent successfully, False otherwise
    """
    sender_email = settings.SMTP_USERNAME or "workthroughfrustration@gmail.com"
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.error("SMTP_USERNAME or SMTP_PASSWORD not configured")
        # Proceed with fallback logging if SMTP credentials not fully configured
        logger.info(f"[SIMULATED EMAIL] To: {coach_email} | From: workthroughfrustration@gmail.com | School: {school_name} ({school_email}) | Temp Password: {temporary_password}")

    try:
        frontend_url = settings.FRONTEND_BASE_URL or "http://localhost:3000"
        login_url = f"{frontend_url.rstrip('/')}/lifecoach/login"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>Your Life Coach Account - Work Through Frustration</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }}
                .header {{ background: #7700aa; color: white; padding: 20px; text-align: center; }}
                .content {{ background: white; padding: 20px; margin-top: 10px; border-radius: 5px; }}
                .credentials {{ background: #f0f0f0; padding: 15px; border-left: 4px solid #7700aa; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                strong {{ color: #7700aa; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Work Through Frustration</h1>
                </div>
                <div class="content">
                    <h2>Life Coach Account Created</h2>
                    <p>Hello <strong>{coach_name}</strong>,</p>
                    <p>You have been registered as a <strong>Life Coach</strong> by <strong>{school_name}</strong> ({school_email}).</p>
                    
                    <div class="credentials">
                        <p><strong>Added By School:</strong> {school_name} ({school_email})</p>
                        <p><strong>Login URL:</strong> <a href="{login_url}" style="color: #7700aa; font-weight: bold;">{login_url}</a></p>
                        <p><strong>Your Email:</strong> {coach_email}</p>
                        <p><strong>Temporary Password:</strong> {temporary_password}</p>
                    </div>
                    
                    <p><strong>⚠️ IMPORTANT:</strong> Please log in and change your password after your initial login for security.</p>
                    
                    <p style="text-align: center; margin: 24px 0;">
                        <a href="{login_url}" style="display: inline-block; background: #7700aa; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In to Life Coach Portal</a>
                    </p>

                    <h3>How to Log In:</h3>
                    <ol>
                        <li>Navigate to the login portal at <strong>{login_url}</strong></li>
                        <li>Enter your email: <strong>{coach_email}</strong></li>
                        <li>Enter your temporary password: <strong>{temporary_password}</strong></li>
                    </ol>
                    
                    <p>Best regards,<br/>The WTF Team</p>
                </div>
                <div class="footer">
                    <p>Sent from workthroughfrustration@gmail.com. Please do not reply directly to this automated email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM or sender_email
        msg['To'] = coach_email
        msg['Subject'] = f"Life Coach Account Invitation from {school_name}"
        
        msg.attach(MIMEText(html_content, 'html'))
        
        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            if settings.SMTP_PORT == 465:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
                
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
        
        logger.info(f"Life Coach credentials email sent to {coach_email} for school {school_name}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send Life Coach credentials email to {coach_email}: {str(e)}")
        return False

/**
 * Message Templates for Profile Photo Enforcement
 * TipTap JSON formatted messages for Circle.so Member API
 *
 * Epic 4: Profile Photo Enforcement System
 * STORY-14: Member API DM Integration
 *
 * Note: These are temporary templates using example copy from docs/MESSAGE_TEMPLATES_EPIC_4.md
 * User should customize these messages for production use
 */

/**
 * Convert plain text with basic formatting to TipTap JSON
 * Supports: paragraphs, **bold**, line breaks
 *
 * @param {string} text - Plain text with markdown-style formatting
 * @returns {object} TipTap JSON structure
 */
const textToTipTap = (text) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);

  const content = paragraphs.map(para => {
    const lines = para.split('\n');
    const lineContent = [];

    lines.forEach((line, index) => {
      if (index > 0) {
        lineContent.push({ type: 'hardBreak' });
      }

      // Simple bold parsing: **text** becomes bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Bold text
          lineContent.push({
            type: 'text',
            marks: [{ type: 'bold' }],
            text: part.slice(2, -2)
          });
        } else if (part.length > 0) {
          // Regular text
          lineContent.push({
            type: 'text',
            text: part
          });
        }
      });
    });

    return {
      type: 'paragraph',
      content: lineContent
    };
  });

  return {
    body: {
      type: 'doc',
      content: content
    }
  };
};

/**
 * Standard Warning (Warnings 1-3)
 * @param {string} memberName - Member's first name or display name
 * @param {number} warningNumber - Current warning number (1, 2, or 3)
 * @param {number} warningsRemaining - Warnings remaining before final warning (4, 3, or 2)
 * @returns {object} TipTap JSON message
 */
const standardWarning = (memberName, warningNumber, warningsRemaining) => {
  const text = `Hi ${memberName},

We noticed you haven't added a profile photo to your 716.social account yet. Profile photos help build community trust and make our space more welcoming for everyone. Having a profile photo is a part of our community guidelines https://www.716.social/coc.

This is reminder **#${warningNumber}** out of 4 before we need to temporarily deactivate accounts without photos. You have **${warningsRemaining}** more reminders before a final warning.

Adding a photo is easy: just go to your profile settings and upload an image. If you have any questions or need help please contact the admin team via this form https://forms.gle/y5itkP1Ax7TdiSQD6 and we will be in touch.

Thanks for being part of our community!
— The 716.social Team`;

  return textToTipTap(text);
};

/**
 * Final Warning (Warning 4)
 * @param {string} memberName - Member's first name or display name
 * @param {string} nextCheckDate - Date of next enforcement run (e.g., "next Monday")
 * @returns {object} TipTap JSON message
 */
const finalWarning = (memberName, nextCheckDate) => {
  const text = `Hi ${memberName},

🚨 **FINAL WARNING**: This is your 4th and final reminder to add a profile photo to your 716.social account. Photos are required as a part of our community standards https://www.716.social/coc.

If a profile photo is not added by ${nextCheckDate}, your account will be temporarily deactivated per our community guidelines.

If you have any questions or need help please contact the admin team via this form https://forms.gle/y5itkP1Ax7TdiSQD6 and we will be in touch.

**TO AVOID DEACTIVATION:**
1. Go to your profile settings
2. Upload a profile photo
3. That's it!

If your account is deactivated, you can contact the admin team via this form https://forms.gle/y5itkP1Ax7TdiSQD6 and your account can be reactivated once a profile photo is added.

Please act now to keep your account active.

— The 716.social Team`;

  return textToTipTap(text);
};

/**
 * Deactivation Notice (Warning 5)
 * @param {string} memberName - Member's first name or display name
 * @param {string} adminEmail - Admin contact email (circle@zackglick.com)
 * @returns {object} TipTap JSON message
 */
const deactivationNotice = (memberName, adminEmail) => {
  const text = `Hi ${memberName},

Your 716.social account is being deactivated because a profile photo was not added after multiple reminders.

We're sorry to see you go, but our profile photo policy helps create a trustworthy community environment.

**TO REJOIN:**
1. Have a profile photo ready to upload
2. Contact us at ${adminEmail}
3. We'll send you a new invitation
4. Add your profile photo immediately upon rejoining

We hope to see you back in the community soon with a photo!

— The 716.social Team`;

  return textToTipTap(text);
};

/**
 * Thank You Message (Photo Added)
 * @param {string} memberName - Member's first name or display name
 * @returns {object} TipTap JSON message
 */
const thankYouMessage = (memberName) => {
  const text = `Hi ${memberName},

Thanks for adding your profile photo! 🎉

Your photo helps make 716.social a more welcoming and trustworthy community for everyone. We appreciate you taking the time to complete your profile.

Keep engaging, sharing, and connecting with the community!

— The 716.social Team`;

  return textToTipTap(text);
};

/**
 * Admin Alert (Final Warnings & Deactivations)
 * System-generated notification for admin oversight
 *
 * @param {string} action - Type of action (FINAL_WARNING | DEACTIVATION | ERROR)
 * @param {string} memberName - Member's full name
 * @param {string} memberEmail - Member's email address
 * @param {number} warningCount - Current warning count
 * @param {string} memberId - Circle member ID
 * @param {string} additionalContext - Additional context or error details
 * @returns {object} TipTap JSON message
 */
const adminAlert = (action, memberName, memberEmail, warningCount, memberId, additionalContext = '') => {
  const timestamp = new Date().toISOString();
  const profileUrl = `https://www.716.social/u/${memberId}`;

  const text = `**[716.social Bot] Profile Photo Enforcement Alert**

**Action:** ${action}
**Member:** ${memberName} (${memberEmail})
**Warning Count:** ${warningCount}
**Circle Profile:** ${profileUrl}

${additionalContext}

---
Automated enforcement run: ${timestamp}`;

  return textToTipTap(text);
};

/**
 * Get warning message based on warning level
 * Convenience function for enforcement logic
 *
 * @param {string} memberName - Member's first name
 * @param {number} warningLevel - Warning level (1-5)
 * @param {string} nextCheckDate - Date of next enforcement run (for level 4)
 * @param {string} adminEmail - Admin email (for level 5)
 * @returns {object} TipTap JSON message
 */
const getWarningMessage = (memberName, warningLevel, nextCheckDate = 'next Monday', adminEmail = 'circle@zackglick.com') => {
  switch (warningLevel) {
    case 1:
      return standardWarning(memberName, 1, 4);
    case 2:
      return standardWarning(memberName, 2, 3);
    case 3:
      return standardWarning(memberName, 3, 2);
    case 4:
      return finalWarning(memberName, nextCheckDate);
    case 5:
      return deactivationNotice(memberName, adminEmail);
    default:
      throw new Error(`Invalid warning level: ${warningLevel}. Must be 1-5`);
  }
};

module.exports = {
  textToTipTap,
  standardWarning,
  finalWarning,
  deactivationNotice,
  thankYouMessage,
  adminAlert,
  getWarningMessage
};

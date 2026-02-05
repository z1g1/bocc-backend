/**
 * Unit tests for Message Templates
 * Tests TipTap JSON generation for Circle.so DM integration
 *
 * TASK-81: Test Message Template Generation (subset of JWT token tests task)
 * Epic 4: Profile Photo Enforcement System
 */

const {
  textToTipTap,
  standardWarning,
  finalWarning,
  deactivationNotice,
  thankYouMessage,
  adminAlert,
  getWarningMessage
} = require('../netlify/functions/utils/message-templates');

describe('Message Templates - TipTap JSON Generation', () => {
  describe('textToTipTap - Plain Text to TipTap Converter', () => {
    it('should convert simple single paragraph', () => {
      const result = textToTipTap('Hello world');

      expect(result).toEqual({
        body: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello world' }
              ]
            }
          ]
        }
      });
    });

    it('should convert multiple paragraphs separated by blank lines', () => {
      const result = textToTipTap('First paragraph\n\nSecond paragraph');

      expect(result.body.content).toHaveLength(2);
      expect(result.body.content[0].type).toBe('paragraph');
      expect(result.body.content[1].type).toBe('paragraph');
    });

    it('should convert line breaks within paragraph to hardBreak nodes', () => {
      const result = textToTipTap('Line 1\nLine 2\nLine 3');

      const paragraph = result.body.content[0];
      expect(paragraph.content).toHaveLength(5); // text, break, text, break, text

      expect(paragraph.content[0]).toEqual({ type: 'text', text: 'Line 1' });
      expect(paragraph.content[1]).toEqual({ type: 'hardBreak' });
      expect(paragraph.content[2]).toEqual({ type: 'text', text: 'Line 2' });
      expect(paragraph.content[3]).toEqual({ type: 'hardBreak' });
      expect(paragraph.content[4]).toEqual({ type: 'text', text: 'Line 3' });
    });

    it('should convert **bold** text to marked text nodes', () => {
      const result = textToTipTap('This is **bold** text');

      const paragraph = result.body.content[0];
      expect(paragraph.content).toHaveLength(3);

      expect(paragraph.content[0]).toEqual({ type: 'text', text: 'This is ' });
      expect(paragraph.content[1]).toEqual({
        type: 'text',
        marks: [{ type: 'bold' }],
        text: 'bold'
      });
      expect(paragraph.content[2]).toEqual({ type: 'text', text: ' text' });
    });

    it('should handle multiple bold sections in one line', () => {
      const result = textToTipTap('**First** and **second** bold');

      const paragraph = result.body.content[0];
      expect(paragraph.content[0]).toEqual({
        type: 'text',
        marks: [{ type: 'bold' }],
        text: 'First'
      });
      expect(paragraph.content[2]).toEqual({
        type: 'text',
        marks: [{ type: 'bold' }],
        text: 'second'
      });
    });

    it('should handle empty strings', () => {
      const result = textToTipTap('');

      expect(result).toEqual({
        body: {
          type: 'doc',
          content: []
        }
      });
    });

    it('should filter out whitespace-only paragraphs', () => {
      const result = textToTipTap('Para 1\n\n   \n\nPara 2');

      expect(result.body.content).toHaveLength(2);
    });
  });

  describe('standardWarning - Warnings 1-3', () => {
    it('should generate warning message for level 1', () => {
      const result = standardWarning('John', 1, 4);

      expect(result.body.type).toBe('doc');
      expect(result.body.content).toBeInstanceOf(Array);
      expect(result.body.content.length).toBeGreaterThan(0);

      // Verify structure
      const firstParagraph = result.body.content[0];
      expect(firstParagraph.type).toBe('paragraph');
      expect(firstParagraph.content).toBeInstanceOf(Array);

      // Verify content includes member name
      const fullText = JSON.stringify(result);
      expect(fullText).toContain('John');
      expect(fullText).toContain('#1');
      expect(fullText).toContain('4');
    });

    it('should generate warning message for level 2', () => {
      const result = standardWarning('Jane', 2, 3);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('Jane');
      expect(fullText).toContain('#2');
      expect(fullText).toContain('3');
    });

    it('should generate warning message for level 3', () => {
      const result = standardWarning('Bob', 3, 2);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('Bob');
      expect(fullText).toContain('#3');
      expect(fullText).toContain('2');
    });

    it('should include 716.social branding', () => {
      const result = standardWarning('Test', 1, 4);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('716.social');
    });

    it('should include profile photo explanation', () => {
      const result = standardWarning('Test', 1, 4);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('profile photo');
    });
  });

  describe('finalWarning - Warning 4', () => {
    it('should generate final warning with urgency markers', () => {
      const result = finalWarning('Alice', 'next Monday');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('Alice');
      expect(fullText).toContain('FINAL WARNING');
      expect(fullText).toContain('🚨');
      expect(fullText).toContain('next Monday');
    });

    it('should include deactivation timeline', () => {
      const result = finalWarning('Test', 'February 10th');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('February 10th');
      expect(fullText).toContain('deactivated');
    });

    it('should include actionable steps', () => {
      const result = finalWarning('Test', 'next week');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('TO AVOID DEACTIVATION');
      expect(fullText).toContain('profile settings');
    });

    it('should include admin contact info', () => {
      const result = finalWarning('Test', 'next Monday');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('circle@zackglick.com');
    });
  });

  describe('deactivationNotice - Warning 5', () => {
    it('should generate deactivation notice with rejoin instructions', () => {
      const result = deactivationNotice('Charlie', 'circle@zackglick.com');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('Charlie');
      expect(fullText).toContain('deactivated');
      expect(fullText).toContain('circle@zackglick.com');
    });

    it('should include rejoin process steps', () => {
      const result = deactivationNotice('Test', 'admin@example.com');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('TO REJOIN');
      expect(fullText).toContain('Contact us');
      expect(fullText).toContain('admin@example.com');
    });

    it('should have apologetic but firm tone', () => {
      const result = deactivationNotice('Test', 'admin@example.com');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('sorry');
      expect(fullText).toContain('policy');
    });
  });

  describe('thankYouMessage - Photo Added', () => {
    it('should generate positive thank you message', () => {
      const result = thankYouMessage('Emma');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('Emma');
      expect(fullText).toContain('Thanks');
      expect(fullText).toContain('🎉');
    });

    it('should include community encouragement', () => {
      const result = thankYouMessage('Test');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('community');
      expect(fullText).toContain('welcoming');
    });

    it('should have warm, positive tone', () => {
      const result = thankYouMessage('Test');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('appreciate');
      expect(fullText).toContain('Keep engaging');
    });
  });

  describe('adminAlert - Admin Notifications', () => {
    it('should generate admin alert for FINAL_WARNING action', () => {
      const result = adminAlert(
        'FINAL_WARNING',
        'John Doe',
        'john@example.com',
        4,
        'abc123',
        'Member has until next Monday to add a photo.'
      );

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('FINAL_WARNING');
      expect(fullText).toContain('John Doe');
      expect(fullText).toContain('john@example.com');
      expect(fullText).toContain('4');
      expect(fullText).toContain('abc123');
      expect(fullText).toContain('next Monday');
    });

    it('should generate admin alert for DEACTIVATION action', () => {
      const result = adminAlert(
        'DEACTIVATION',
        'Jane Smith',
        'jane@example.com',
        5,
        'def456',
        'Account deactivated after 5 warnings.'
      );

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('DEACTIVATION');
      expect(fullText).toContain('Jane Smith');
      expect(fullText).toContain('5');
    });

    it('should include profile URL', () => {
      const result = adminAlert('ERROR', 'Test', 'test@example.com', 3, 'xyz789', 'API error');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('https://www.716.social/u/xyz789');
    });

    it('should include timestamp', () => {
      const result = adminAlert('FINAL_WARNING', 'Test', 'test@example.com', 4, '123', '');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('Automated enforcement run');
      // Should contain ISO timestamp format
      expect(fullText).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    });

    it('should handle empty additional context', () => {
      const result = adminAlert('FINAL_WARNING', 'Test', 'test@example.com', 4, '123');

      expect(result.body.type).toBe('doc');
      expect(result.body.content).toBeInstanceOf(Array);
    });
  });

  describe('getWarningMessage - Convenience Function', () => {
    it('should return standard warning for level 1', () => {
      const result = getWarningMessage('John', 1);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('John');
      expect(fullText).toContain('#1');
    });

    it('should return standard warning for level 2', () => {
      const result = getWarningMessage('Jane', 2);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('#2');
    });

    it('should return standard warning for level 3', () => {
      const result = getWarningMessage('Bob', 3);

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('#3');
    });

    it('should return final warning for level 4', () => {
      const result = getWarningMessage('Alice', 4, 'March 1st');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('FINAL WARNING');
      expect(fullText).toContain('March 1st');
    });

    it('should return deactivation notice for level 5', () => {
      const result = getWarningMessage('Charlie', 5, 'unused', 'admin@test.com');

      const fullText = JSON.stringify(result);
      expect(fullText).toContain('deactivated');
      expect(fullText).toContain('admin@test.com');
    });

    it('should throw error for invalid warning level', () => {
      expect(() => getWarningMessage('Test', 0)).toThrow('Invalid warning level: 0');
      expect(() => getWarningMessage('Test', 6)).toThrow('Invalid warning level: 6');
      expect(() => getWarningMessage('Test', -1)).toThrow('Invalid warning level');
    });

    it('should use default values for nextCheckDate and adminEmail', () => {
      const result4 = getWarningMessage('Test', 4);
      const fullText4 = JSON.stringify(result4);
      expect(fullText4).toContain('next Monday');

      const result5 = getWarningMessage('Test', 5);
      const fullText5 = JSON.stringify(result5);
      expect(fullText5).toContain('circle@zackglick.com');
    });
  });

  describe('TipTap JSON Structure Validation', () => {
    it('should have valid root structure for all message types', () => {
      const messages = [
        standardWarning('Test', 1, 4),
        finalWarning('Test', 'tomorrow'),
        deactivationNotice('Test', 'admin@test.com'),
        thankYouMessage('Test'),
        adminAlert('FINAL_WARNING', 'Test', 'test@test.com', 4, '123', '')
      ];

      messages.forEach(message => {
        expect(message).toHaveProperty('body');
        expect(message.body).toHaveProperty('type', 'doc');
        expect(message.body).toHaveProperty('content');
        expect(message.body.content).toBeInstanceOf(Array);
      });
    });

    it('should have valid paragraph nodes', () => {
      const result = standardWarning('Test', 1, 4);

      result.body.content.forEach(node => {
        expect(node.type).toBe('paragraph');
        expect(node).toHaveProperty('content');
        expect(node.content).toBeInstanceOf(Array);
      });
    });

    it('should have valid text nodes within paragraphs', () => {
      const result = thankYouMessage('Test');

      result.body.content.forEach(paragraph => {
        paragraph.content.forEach(node => {
          expect(['text', 'hardBreak']).toContain(node.type);

          if (node.type === 'text') {
            expect(node).toHaveProperty('text');
            expect(typeof node.text).toBe('string');

            if (node.marks) {
              expect(node.marks).toBeInstanceOf(Array);
            }
          }
        });
      });
    });
  });
});

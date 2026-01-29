const { escapeAirtableFormula, isValidEmail } = require('./validation');

describe('escapeAirtableFormula', () => {
    describe('handles valid inputs', () => {
        it('should return unchanged string for normal email', () => {
            expect(escapeAirtableFormula('user@example.com')).toBe('user@example.com');
        });

        it('should return unchanged string for alphanumeric input', () => {
            expect(escapeAirtableFormula('test123')).toBe('test123');
        });

        it('should handle empty string', () => {
            expect(escapeAirtableFormula('')).toBe('');
        });
    });

    describe('escapes dangerous characters', () => {
        it('should escape single quotes', () => {
            expect(escapeAirtableFormula("o'brien@example.com")).toBe("o\\'brien@example.com");
        });

        it('should escape multiple single quotes', () => {
            expect(escapeAirtableFormula("it's o'brien's")).toBe("it\\'s o\\'brien\\'s");
        });

        it('should escape backslashes', () => {
            expect(escapeAirtableFormula('test\\value')).toBe('test\\\\value');
        });

        it('should escape backslashes before single quotes', () => {
            expect(escapeAirtableFormula("test\\'value")).toBe("test\\\\\\'value");
        });
    });

    describe('prevents formula injection attacks', () => {
        it('should escape SQL-style injection attempt', () => {
            const malicious = "' OR TRUE() OR '1'='1";
            const escaped = escapeAirtableFormula(malicious);
            expect(escaped).toBe("\\' OR TRUE() OR \\'1\\'=\\'1");
            // All single quotes should be escaped with backslash
            expect(escaped.match(/(?<!\\)'/g)).toBeNull();
        });

        it('should escape formula breakout attempt', () => {
            const malicious = "test@example.com' OR 1=1 OR '";
            const escaped = escapeAirtableFormula(malicious);
            expect(escaped).toBe("test@example.com\\' OR 1=1 OR \\'");
        });

        it('should escape nested quote injection', () => {
            const malicious = "admin'--";
            const escaped = escapeAirtableFormula(malicious);
            expect(escaped).toBe("admin\\'--");
        });

        it('should handle complex injection payload', () => {
            const malicious = "'), {secret}) OR ({email} = '";
            const escaped = escapeAirtableFormula(malicious);
            expect(escaped).toBe("\\'), {secret}) OR ({email} = \\'");
        });
    });

    describe('handles edge cases', () => {
        it('should return empty string for null', () => {
            expect(escapeAirtableFormula(null)).toBe('');
        });

        it('should return empty string for undefined', () => {
            expect(escapeAirtableFormula(undefined)).toBe('');
        });

        it('should return empty string for number', () => {
            expect(escapeAirtableFormula(123)).toBe('');
        });

        it('should return empty string for object', () => {
            expect(escapeAirtableFormula({})).toBe('');
        });

        it('should return empty string for array', () => {
            expect(escapeAirtableFormula([])).toBe('');
        });
    });
});

describe('isValidEmail', () => {
    describe('accepts valid emails', () => {
        it('should accept standard email format', () => {
            expect(isValidEmail('user@example.com')).toBe(true);
        });

        it('should accept email with subdomain', () => {
            expect(isValidEmail('user@mail.example.com')).toBe(true);
        });

        it('should accept email with plus sign', () => {
            expect(isValidEmail('user+tag@example.com')).toBe(true);
        });

        it('should accept email with dots in local part', () => {
            expect(isValidEmail('first.last@example.com')).toBe(true);
        });

        it('should accept email with numbers', () => {
            expect(isValidEmail('user123@example123.com')).toBe(true);
        });

        it('should accept email with hyphen in domain', () => {
            expect(isValidEmail('user@my-domain.com')).toBe(true);
        });
    });

    describe('rejects invalid emails', () => {
        it('should reject email without @', () => {
            expect(isValidEmail('userexample.com')).toBe(false);
        });

        it('should reject email without domain', () => {
            expect(isValidEmail('user@')).toBe(false);
        });

        it('should reject email without local part', () => {
            expect(isValidEmail('@example.com')).toBe(false);
        });

        it('should reject email with spaces', () => {
            expect(isValidEmail('user @example.com')).toBe(false);
        });

        it('should reject email without TLD', () => {
            expect(isValidEmail('user@example')).toBe(false);
        });

        it('should reject empty string', () => {
            expect(isValidEmail('')).toBe(false);
        });

        it('should reject plain text', () => {
            expect(isValidEmail('not an email')).toBe(false);
        });
    });

    describe('rejects injection attempts', () => {
        it('should reject email with single quotes', () => {
            expect(isValidEmail("user'@example.com")).toBe(false);
        });

        it('should reject SQL injection pattern', () => {
            expect(isValidEmail("' OR '1'='1")).toBe(false);
        });

        it('should reject formula injection pattern', () => {
            expect(isValidEmail("test@example.com' OR TRUE()")).toBe(false);
        });
    });

    describe('handles edge cases', () => {
        it('should return false for null', () => {
            expect(isValidEmail(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isValidEmail(undefined)).toBe(false);
        });

        it('should return false for number', () => {
            expect(isValidEmail(123)).toBe(false);
        });

        it('should return false for object', () => {
            expect(isValidEmail({})).toBe(false);
        });

        it('should return false for array', () => {
            expect(isValidEmail([])).toBe(false);
        });
    });
});

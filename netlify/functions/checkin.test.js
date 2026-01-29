// Mock the airtable module before requiring checkin
jest.mock('./utils/airtable', () => ({
    fetchAttendeeByEmail: jest.fn(),
    createAttendee: jest.fn(),
    createCheckinEntry: jest.fn()
}));

const { handler } = require('./checkin');
const { fetchAttendeeByEmail, createAttendee, createCheckinEntry } = require('./utils/airtable');

describe('checkin handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const createEvent = (body, method = 'POST') => ({
        httpMethod: method,
        body: JSON.stringify(body)
    });

    describe('CORS preflight', () => {
        it('should handle OPTIONS request', async () => {
            const event = { httpMethod: 'OPTIONS' };
            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
            expect(response.headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
        });
    });

    describe('email validation', () => {
        it('should reject request without email', async () => {
            const event = createEvent({ name: 'Test User' });
            const response = await handler(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Email is required');
        });

        it('should reject request with empty email', async () => {
            const event = createEvent({ email: '' });
            const response = await handler(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Email is required');
        });

        it('should reject request with invalid email format', async () => {
            const event = createEvent({ email: 'not-an-email' });
            const response = await handler(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid email format');
        });

        it('should reject SQL injection attempt in email', async () => {
            const event = createEvent({ email: "' OR '1'='1" });
            const response = await handler(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid email format');
        });

        it('should reject formula injection attempt in email', async () => {
            const event = createEvent({ email: "test@example.com' OR TRUE() OR '" });
            const response = await handler(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body).message).toBe('Invalid email format');
        });

        it('should accept valid email format', async () => {
            fetchAttendeeByEmail.mockResolvedValue({ id: 'rec123' });
            createCheckinEntry.mockResolvedValue({ id: 'checkin123' });

            const event = createEvent({
                email: 'user@example.com',
                eventId: 'event123'
            });
            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(fetchAttendeeByEmail).toHaveBeenCalledWith('user@example.com');
        });
    });

    describe('existing attendee checkin', () => {
        it('should create checkin for existing attendee', async () => {
            const existingAttendee = { id: 'rec123' };
            fetchAttendeeByEmail.mockResolvedValue(existingAttendee);
            createCheckinEntry.mockResolvedValue({ id: 'checkin123' });

            const event = createEvent({
                email: 'existing@example.com',
                eventId: 'event123',
                debug: '1',
                token: 'abc123'
            });
            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body).message).toBe('Check-in successful');
            expect(createCheckinEntry).toHaveBeenCalledWith('rec123', 'event123', true, 'abc123');
            expect(createAttendee).not.toHaveBeenCalled();
        });
    });

    describe('new attendee checkin', () => {
        it('should create new attendee and checkin when attendee does not exist', async () => {
            fetchAttendeeByEmail.mockResolvedValue(null);
            createAttendee.mockResolvedValue({ id: 'newrec123' });
            createCheckinEntry.mockResolvedValue({ id: 'checkin123' });

            const event = createEvent({
                email: 'new@example.com',
                name: 'New User',
                phone: '123-456-7890',
                businessName: 'Test Business',
                okToEmail: true,
                eventId: 'event123',
                debug: '0',
                token: ''
            });
            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(createAttendee).toHaveBeenCalledWith(
                'new@example.com',
                'New User',
                '123-456-7890',
                'Test Business',
                true,
                false
            );
            expect(createCheckinEntry).toHaveBeenCalledWith('newrec123', 'event123', false, '');
        });
    });

    describe('error handling', () => {
        it('should return 500 on database error', async () => {
            fetchAttendeeByEmail.mockRejectedValue(new Error('Database connection failed'));

            const event = createEvent({
                email: 'user@example.com',
                eventId: 'event123'
            });
            const response = await handler(event);

            expect(response.statusCode).toBe(500);
            expect(JSON.parse(response.body).message).toBe('Internal Server Error');
        });
    });

    describe('debug flag handling', () => {
        it('should set debug flag to true when debug is "1"', async () => {
            fetchAttendeeByEmail.mockResolvedValue({ id: 'rec123' });
            createCheckinEntry.mockResolvedValue({ id: 'checkin123' });

            const event = createEvent({
                email: 'user@example.com',
                eventId: 'event123',
                debug: '1'
            });
            await handler(event);

            expect(createCheckinEntry).toHaveBeenCalledWith('rec123', 'event123', true, '');
        });

        it('should set debug flag to false when debug is "0"', async () => {
            fetchAttendeeByEmail.mockResolvedValue({ id: 'rec123' });
            createCheckinEntry.mockResolvedValue({ id: 'checkin123' });

            const event = createEvent({
                email: 'user@example.com',
                eventId: 'event123',
                debug: '0'
            });
            await handler(event);

            expect(createCheckinEntry).toHaveBeenCalledWith('rec123', 'event123', false, '');
        });

        it('should set debug flag to false when debug is not provided', async () => {
            fetchAttendeeByEmail.mockResolvedValue({ id: 'rec123' });
            createCheckinEntry.mockResolvedValue({ id: 'checkin123' });

            const event = createEvent({
                email: 'user@example.com',
                eventId: 'event123'
            });
            await handler(event);

            expect(createCheckinEntry).toHaveBeenCalledWith('rec123', 'event123', false, '');
        });
    });
});

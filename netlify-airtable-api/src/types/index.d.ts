interface Attendee {
    id: string;
    email: string;
    name?: string;
    createdAt: string;
}

interface CheckIn {
    id: string;
    attendeeId: string;
    checkInTime: string;
}

interface AirtableResponse<T> {
    records: T[];
    offset?: string;
}

export { Attendee, CheckIn, AirtableResponse };
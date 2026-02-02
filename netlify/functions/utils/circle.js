const axios = require('axios');

// Circle.so Admin API v2 configuration
const CIRCLE_API_BASE_URL = 'https://app.circle.so/api/admin/v2';
const CIRCLE_API_TOKEN = process.env.CIRCLE_API_TOKEN;

console.log('Circle API Token:', CIRCLE_API_TOKEN ? 'Exists' : 'Not set');

// Create axios instance with default configuration
const circleApi = axios.create({
    baseURL: CIRCLE_API_BASE_URL,
    headers: {
        'Authorization': `Bearer ${CIRCLE_API_TOKEN}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Search for a community member by email
 * @param {string} email - Member email address
 * @returns {Promise<object|null>} Member object if found, null otherwise
 */
const findMemberByEmail = async (email) => {
    try {
        console.log('Searching for Circle member:', email);

        // GET /api/admin/v2/community_members with pagination
        // We'll need to search through results to find matching email
        const response = await circleApi.get('/community_members', {
            params: {
                per_page: 100  // Fetch more results to improve search
            }
        });

        if (response.data && response.data.records) {
            // Search for member with matching email (case-insensitive)
            const member = response.data.records.find(
                m => m.email && m.email.toLowerCase() === email.toLowerCase()
            );

            if (member) {
                console.log('Found existing Circle member:', member.id);
                return member;
            }
        }

        console.log('No Circle member found with email:', email);
        return null;
    } catch (error) {
        console.error('Error searching for Circle member:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Create or invite a new community member
 * @param {string} email - Member email address
 * @param {string} name - Member name
 * @returns {Promise<object>} Created member object
 */
const createMember = async (email, name) => {
    try {
        console.log('Creating Circle member:', email, name);

        const response = await circleApi.post('/community_members', {
            email: email,
            name: name
            // Additional fields may be required - will discover during testing
        });

        console.log('Successfully created Circle member:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating Circle member:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
};

/**
 * Create or update a community member (finds existing first)
 * @param {string} email - Member email address
 * @param {string} name - Member name
 * @returns {Promise<object>} Member object (existing or newly created)
 */
const ensureMember = async (email, name) => {
    // First check if member exists
    const existingMember = await findMemberByEmail(email);

    if (existingMember) {
        console.log('Member already exists in Circle:', email);
        return existingMember;
    }

    // Create new member if not found
    console.log('Creating new Circle member:', email);
    return await createMember(email, name);
};

module.exports = {
    findMemberByEmail,
    createMember,
    ensureMember
};

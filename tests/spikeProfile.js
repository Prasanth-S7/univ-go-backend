import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    scenarios: {
        single_user_profile_test: {
            executor: 'shared-iterations',
            vus: 1, // Only 1 virtual user
            iterations: 10000, // Total iterations to run
            maxDuration: '5m', // Maximum test duration
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    },
};

let authToken = null;

export function setup() {
    // Login once before the test starts
    const email = '230701337@rajalakshmi.edu.in';

    const loginRes = http.post(
        'http://localhost:3000/api/auth/login/',
        JSON.stringify({
            email: email,
            password: 'random',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );

    console.log('Setup - Login status:', loginRes.status);

    if (loginRes.status !== 200) {
        throw new Error(`Login failed with status ${loginRes.status}`);
    }

    const cookies = loginRes.cookies.token;
    const token = cookies[0].value;

    console.log('Setup - Authentication successful, token obtained');

    // Return the token to be used in the main test
    return { token: token };
}

export default function (data) {
    // Use the token from setup - this is the SAME token for all iterations
    const token = data.token;

    // Hit the profile endpoint continuously with the same token
    const profileRes = http.get(
        'http://localhost:3000/api/auth/profile/',
        {
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    if (profileRes.status !== 200) {
        console.error('Profile request failed:', profileRes.status, profileRes.body);
    }

    // Small sleep to avoid hammering the server too hard
    // Adjust or remove based on your testing needs
    // sleep(0.1);
}

export function teardown(data) {
    console.log('Test completed for user with token');
}
import http from 'k6/http';
import { sleep } from 'k6';
import { EMAILS } from './data/emails.js';

export const options = {
    scenarios: {
        multiple_users_login_test: {
            executor: 'shared-iterations',
            vus: 500, // Number of concurrent virtual users
            iterations: 3000, // Total login attempts
            maxDuration: '5m', // Maximum test duration
        },
    },
    // thresholds: {
    //     http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    //     http_req_failed: ['rate<0.01'], // Less than 1% failure rate
    // },
};

export default function () {
    // Pick a random email for each iteration (simulating different users)
    const email = EMAILS[Math.floor(Math.random() * EMAILS.length)];

    // Hit the login endpoint
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

    // Log failures for debugging
    if (loginRes.status !== 200) {
        console.error(`Login failed for ${email}:`, loginRes.status, loginRes.body);
    }

    // Small sleep to simulate realistic behavior
    // Remove or adjust based on your testing needs
    // sleep(0.1);
}

export function teardown() {
    console.log('Login load test completed');
}
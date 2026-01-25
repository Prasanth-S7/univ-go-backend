import http from 'k6/http';
import { sleep, check } from 'k6';
import { EMAILS } from './data/emails.js';

// Configuration can be overridden by CLI flags:
// k6 run --vus 10 --duration 30s tests/simple_load_test.js
export const options = {
    scenarios: {
        login_spike: {
            executor: 'per-vu-iterations',
            vus: 1000,
            iterations: 1,   // EACH user logs in once
            maxDuration: '30s',
        },
    },
    thresholds: {
        http_req_failed: ['rate<0.02'],        // allow up to 2% failure in spikes
        http_req_duration: ['p(95)<1500'],     // realistic for spike
    },
};

const BASE_URL = 'http://13.232.26.143';

export default function () {
    // Pick a random email
    const email = EMAILS[Math.floor(Math.random() * EMAILS.length)];

    // 1. LOGIN
    const loginRes = http.post(
        `${BASE_URL}/api/auth/login/`,
        JSON.stringify({
            email: email,
            password: 'random', // Password seems to be hardcoded/ignored in test env
        }),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'Login' },
        }
    );

    const loginSuccess = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
    });

    if (!loginSuccess) {
        console.error(`Login failed for ${email}: ${loginRes.status}`);
        return; // Stop iteration if login fails
    }

    // Extract token
    // Note: Adjust property access if your cookie structure is different
    const token = loginRes.cookies.token && loginRes.cookies.token[0] ? loginRes.cookies.token[0].value : null;

    const params = {
        headers: {
            'Cookie': `token=${token}`,
            'Content-Type': 'application/json',
        },
    };

    // 2. PROFILE
    const profileRes = http.get(
        `${BASE_URL}/api/auth/profile/`,
        {
            ...params,
            tags: { name: 'Profile' },
        }
    );

    check(profileRes, {
        'profile status is 200': (r) => r.status === 200,
    });

    // 3. SESSIONS
    const sessionsRes = http.get(
        `${BASE_URL}/api/timetable/student/sessions/`,
        {
            ...params,
            tags: { name: 'Sessions' },
        }
    );

    check(sessionsRes, {
        'sessions status is 200': (r) => r.status === 200,
    });

    // sleep(1);
}

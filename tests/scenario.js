import http from 'k6/http';
import { sleep } from 'k6';
import { EMAILS } from './data/emails.js';

// ========================================
// SCENARIO 1: Constant Load Test
// Maintains constant RPS for extended period
// ========================================
export const constantLoadOptions = {
    scenarios: {
        constant_load: {
            executor: 'constant-arrival-rate',
            rate: 100,              // 100 iterations per second
            timeUnit: '1s',         // per second
            duration: '5m',         // for 5 minutes
            preAllocatedVUs: 200,   // Pre-allocated VUs
            maxVUs: 500,            // Max VUs if needed
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'], // Less than 1% errors
    },
};

// ========================================
// SCENARIO 2: Ramping Load Test
// Gradually increases load to find breaking point
// ========================================
export const rampingLoadOptions = {
    scenarios: {
        ramping_load: {
            executor: 'ramping-arrival-rate',
            startRate: 10,          // Start with 10 req/s
            timeUnit: '1s',
            preAllocatedVUs: 500,
            maxVUs: 2000,
            stages: [
                { target: 50, duration: '1m' },   // Ramp to 50 req/s
                { target: 100, duration: '1m' },  // Ramp to 100 req/s
                { target: 200, duration: '1m' },  // Ramp to 200 req/s
                { target: 300, duration: '1m' },  // Ramp to 300 req/s
                { target: 400, duration: '1m' },  // Ramp to 400 req/s
                { target: 500, duration: '1m' },  // Ramp to 500 req/s
                { target: 600, duration: '2m' },  // Hold at 600 req/s
                { target: 0, duration: '30s' },   // Ramp down
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.05'], // Less than 5% errors
    },
};

// ========================================
// SCENARIO 3: Spike Test
// Tests system behavior under sudden traffic spikes
// ========================================
export const spikeTestOptions = {
    scenarios: {
        spike_test: {
            executor: 'ramping-arrival-rate',
            startRate: 100,        // Start with 100 RPS
            timeUnit: '1s',
            preAllocatedVUs: 1000,
            maxVUs: 1500,
            stages: [
                { target: 500, duration: '10s' },   // Ramp to 500 RPS
                { target: 1000, duration: '5s' },   // Ramp to 1000 RPS
                { target: 1000, duration: '30s' },  // Hold at 1000 RPS for 30s
                { target: 0, duration: '10s' },     // Ramp down
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<1000'],
        http_req_failed: ['rate<0.1'],
    },
};

// ========================================
// Choose your test by uncommenting one:
// ========================================
export const options = spikeTestOptions; // Change this to test different scenarios

// ========================================
// Main test function
// ========================================
export default function () {
    const email = EMAILS[Math.floor(Math.random() * EMAILS.length)];

    // LOGIN
    const loginRes = http.post(
        // 'https://api-teachers.rajalakshmi.org/api/auth/login/',
        // 'http://13.232.26.143/api/auth/login/',
        'http://localhost:3000/api/auth/login/',
        JSON.stringify({
            email: email,
            password: 'random',
        }),
        {
            headers: {
                'Content-Type': 'application/json',
            },
            tags: { name: 'Login' }, // Tag for better metrics
        }
    );

    console.log(`login status: ${loginRes.status}`);

    if (loginRes.status !== 200) {
        console.error(`Login failed: ${loginRes.status}`);
        return; // Skip rest if login fails
    }

    const token = loginRes.cookies.token[0].value;

    // PROFILE
    const profileRes = http.get(
        // 'https://api-teachers.rajalakshmi.org/api/auth/profile/',
        // 'http://13.232.26.143/api/auth/profile/',
        'http://localhost:3000/api/auth/profile/',
        {
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json',
            },
            tags: { name: 'Profile' },
        }
    );

    console.log(`profile status: ${profileRes.status}`);

    // SESSIONS
    const sessions = http.get(
        // 'https://api-teachers.rajalakshmi.org/api/timetable/student/sessions/',
        // 'http://13.232.26.143/api/timetable/student/sessions/',
        'http://localhost:3000/api/timetable/student/sessions/',
        {
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json',
            },
            tags: { name: 'Sessions' },
        }
    );

    console.log(`session status: ${sessions.status}`);

    // Realistic user think time (remove for max load)
    sleep(1);
}

// ========================================
// Summary handler
// ========================================
export function handleSummary(data) {
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}

function textSummary(data, options) {
    const indent = options.indent || '';
    const colors = options.enableColors;

    return `
${indent}Test Summary:
${indent}  Total Requests: ${data.metrics.http_reqs.values.count}
${indent}  Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
${indent}  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s
${indent}  Avg Duration: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  P95 Duration: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  P99 Duration: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
    `;
}

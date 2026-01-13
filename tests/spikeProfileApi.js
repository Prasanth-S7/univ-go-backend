import http from 'k6/http';
import { sleep } from 'k6';
import { EMAILS } from './data/emails.js';

export const options = {
    stages: [
        { duration: '2m', target: 2000 },
        { duration: '1m', target: 0 },
    ],
};

export default function () {
    const email = EMAILS[Math.floor(Math.random() * EMAILS.length)];

    // LOGIN
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

    console.log('login status:', loginRes.status);

    const cookies = loginRes.cookies.token;

    // console.log('cookies: ', cookies);

    const token = cookies[0].value;

    // console.log('token: ', token);

    const profileRes = http.get(
        'http://localhost:3000/api/auth/profile/',
        {
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    console.log('profile status:', profileRes.status);
    // console.log('profile Response: ', profileRes.json());

    sleep(1);
}

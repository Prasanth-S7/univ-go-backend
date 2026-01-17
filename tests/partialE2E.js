import http from 'k6/http';
import { sleep } from 'k6';
import { EMAILS } from './data/emails.js';

export const options = {
    scenarios: {
        multiple_users_login_test: {
            executor: 'shared-iterations',
            vus: 1500,
            iterations: 2000,
            maxDuration: '5m',
        },
    },
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

    //hitting the getSession route

    const sessions = http.get(
        'http://localhost:3000/api/timetable/student/sessions/',
        {
            headers: {
                'Cookie': `token=${token}`,
                'Content-Type': 'application/json',
            },
        }
    );

    console.log('sessions status:', sessions.status);

    // const addBulk = http.post(
    //     'http://localhost:3000/api/timetable/student/add/bulk/',
    //     JSON.stringify({
    //         selections: [
    //             {
    //                 teacher_course_id: 1,
    //                 batch: 'theory',
    //                 is_do_more_course: false,
    //             },
    //         ],
    //     }),
    //     {
    //         headers: {
    //             'Cookie': `token=${token}`,
    //             'Content-Type': 'application/json',
    //         },
    //     }
    // );

    // console.log('bulk status:', addBulk.status);

    // console.log('profile Response: ', profileRes.json());

    sleep(1);
}

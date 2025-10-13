const QUESTION_SERVICE_URL = process.env.NEXT_PUBLIC_API_QUESTION_SERVICE!;

// get all topics + color hex assigned to each topic
export async function getTopics() {
    try {
        const res = await fetch(`${QUESTION_SERVICE_URL}/topics`);

        if (!res.ok) {
            throw new Error(`Failed to fetch topics: ${res.status} ${res.statusText}`);
        }

        const data = await res.json()
        return data;
    } catch (err) {
        console.error("Error fetching topics:", err);
        return { items: [] }; 
    }
}

/* Non-Admin GET */

// get all questions for non-admin
export async function getQuestions(page=0, page_size=10, topic?: string) {
    try {
        const query = new URLSearchParams ({
            page: page.toString(),
            page_size: page_size.toString()
        });

        if (topic && topic !== 'All Topics') {
            query.append('topic', topic);
        }

        const url = `${QUESTION_SERVICE_URL}/questions?${query.toString()}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to fetch /questions: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching /questions: ", err);
        return { items: [] };
    }
}

// get a single question by ID (for non-admin)
export async function getQuestionById(id: string) {
    try {
        const url = `${QUESTION_SERVICE_URL}/questions/${id}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to fetch from /questions/{id}: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error('Error fetching from /questions/{id}: ', err);
        return null;
    }
}

/* Admin API calls*/

// get all questions for admin (includes all versions, status etc.)
// break questions into pages of page size, filter by topic (if needed)
export async function getAdminQuestions(page=0, page_size=10, topic?: string) {
    try {
        const query = new URLSearchParams ({
            page: page.toString(),
            page_size: page_size.toString()
        });

        if (topic && topic !== 'All Topics') {
            query.append('topic', topic);
        }

        const url = `${QUESTION_SERVICE_URL}/admin/questions?${query.toString()}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Failed to fetch admin/questions: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching admin/questions: ", err);
        return { items: [] };
    }
}

// create a new question (draft)
export async function postQuestion(data: {
    title: string;
    body_md: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    topics: string[];
    attachments?: {
        object_key: string;
        mime: string;
        alt: string;
    }[],
}) {
    try {
        const url = `${QUESTION_SERVICE_URL}/admin/questions`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                // 'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });

        if (res.status !== 201) {
            throw new Error(`Error posting to admin/questions: ${res.status} ${res.statusText}`);
        }

        const response = await res.json();
        return response;

    } catch (err) {
        console.error("Error posting to admin/questions: ", err);
        return null
    }
}

// update a question
export async function patchQuestion(
    id: string,
    data: Partial<{
        title: string;
        body_md: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        topics: string[];
        attachments: {
            object_key: string;
            mime: string;
            alt: string;
        }[];
    }>
) {
    try {
        const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}`;

        const res = await fetch(url, {
            method: 'PATCH',
            headers: {
                // 'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });

        if (res.status !== 200) {
            throw new Error(`Error patching to admin/questions: ${res.status} ${res.statusText}`);
        }

        const response = await res.json();
        return response;
    } catch (err) {
        console.error("Error patching to admin/questions: ", err);
        return null;
    }
}

// delete a question for admin
export async function deleteQuestion(id: string) {
    try {
        const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}`;
        const res = await fetch(url, {
            method: 'DELETE',
            // headers: {
            //     'Authorization': `Bearer ${token}`,
            // }
        });

        if (res.status == 204) {
            return true;
        } else {
            throw new Error(`Failed to delete /admin/questions/${id}: ${res.status} ${res.statusText}`);
        }
    } catch (err) {
        console.error(`Error deleting /admin/questions/${id}`, err);
        return false;
    }
}

// publish a drafted question
export async function publishQuestion(id: string) {
    try {
        const url = `${QUESTION_SERVICE_URL}/admin/questions/${id}/publish`;

        const res = await fetch(url, {
            method: 'POST',
            // headers: {
            //     'Authorization': `Bearer ${token}`
            // },
        });

        if (!res.ok) {
            throw new Error(`Failed to publish /admin/questions/${id}: ${res.status} ${res.statusText}`);
        }

        const publishedQuestion = await res.json();
        return publishedQuestion;
    } catch (err) {
        console.error(`Error publishing /admin/questions/${id}:`, err);
        return null;
    }
}

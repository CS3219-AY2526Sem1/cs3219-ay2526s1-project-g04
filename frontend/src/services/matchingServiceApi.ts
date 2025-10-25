const MATCHING_URL = process.env.NEXT_PUBLIC_API_MATCHING!;

export async function getTopics() {
  const res = await fetch(`${MATCHING_URL}/topics`);
  return res.json();
}

export async function postQuestion(data: {
  title: string;
  body_md: string;
  difficulty: string;
  topics: string[];
}) {
  const res = await fetch(`${MATCHING_URL}/admin/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status}`);
  }

  return res.json();
}

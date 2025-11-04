const COLLAB_SERVICE_URL = process.env.COLLAB_SERVICE_URL!;
// const COLLAB_SERVICE_URL = 'http://localhost:3009';

export async function getQuestionIdBySessId(
  sessId: string,
): Promise<string | null> {
  try {
    console.log(COLLAB_SERVICE_URL);
    const url = `${COLLAB_SERVICE_URL}/question/${sessId}`;
    console.log(url);
    const res = await fetch(url);

    if (!res.ok) {
      console.log(url);
      throw new Error(
        `Failed to fetch from /question/{id}: ${res.status} ${res.statusText}`,
      );
    }

    const data: Record<string, string> = await res.json();
    return data['question_id'];
  } catch (err) {
    console.error('Error fetching from /question/{id}: ', err);
    return null;
  }
}

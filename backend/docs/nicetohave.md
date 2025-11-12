## Nice-to-Have Features

Our team has decided to prioritize the N2H features that provide the most immediate value to the user and the platform.

### Admin Permissions

* **Relevance:** This is critical for platform viability. It allows trusted admins to populate and maintain the question bank, which is the core content of the site, and manage other platform-wide settings.
* **Technical Feasibility:** High. The implementation is split clearly:
    * **Backend:** The User Service issues a JWT with the user's `role` in the payload. Other services (like the Question Service) implement a simple middleware to verify this `role` before allowing access to protected endpoints (e.g., `POST /questions`).
    * **Frontend:** The frontend application decodes the JWT upon login and stores the `role`. This `role` is used to conditionally render admin-specific UI elements, such as an "Add/Edit Question" button on question bank page.
* **Role Allocation:** Danielle

### Past Sessions

* **Relevance:** This is a core feature for the "Review & Improve" user loop. It allows users to see their practice history, the date, the question, and who they practiced with.
* **Technical Feasibility:** High. This feature is primarily an **orchestration task handled by the frontend**.
    * 1. The frontend first calls the Session/Collab Service (`GET /collab/sessions/:userId`) to get the list of past session records. This response includes `sessionId`, `questionId`, an array of `userIds` (participants), and the date.
    * 2. The frontend then aggregates all the unique `questionId`s and `userId`s from this list.
    * 3. The frontend makes one or two batched API calls (e.g., `GET /questions?ids=...` and `GET /users?ids=...`) to the Question and User services to "enrich" these IDs with human-readable data (question titles, peer usernames).
    * 4. Finally, the frontend stitches this data together to display the full history page.
* **Role Allocation:** Yi Ling

### Dashboard Analytics

* **Relevance:** Provides immediate, at-a-glance value to the user. It encourages them by tracking progress and helping them identify weak spots (e.g., "5/10 Array problems solved vs. 1/50 Graph problem").
* **Technical Feasibility:** High. By moving the calculation logic to the frontend, this feature becomes much simpler to implement.
    * **Implementation:** This feature requires **no new backend work**. The frontend will reuse the enriched data array it already fetched for the "Past Sessions" feature.
    * **Logic:** The frontend application will simply iterate over this array (which now contains question details like topic and difficulty) and perform its own calculations (e.g., `totalCompleted = sessions.length`, `easyCompleted = sessions.filter(s => s.question.difficulty === 'Easy').length`) to populate the summary card.
* **Role Allocation:** Yixin



### Collab Messaging + Drawing

* **Relevance:** High. These features are the *collaboration* in "PeerPrep." They make the shared coding experience feel live, interactive, and human. `Cursor Highlighting` provides a clear focus point during discussion, and `Collab Messaging` allows communication if users don't want to use voice chat, and `Collab Drawing` allows users to communicate their concepts more clearly, and we think that it is especially important for solving coding problems.
* **Technical Feasibility:** High. The `Collab Service` will elaborate.
* **Role Allocation:** Debbie

### Code Interpreter

* **Relevance:** Extremely High. This feature would complete the core user loop by allowing users to **run** their code against test cases and get immediate feedback, just like in a real interview or on LeetCode.
* **Technical Feasibility:** High. `Collab Service` will elaborate.
    * **Language Support:** Python
* **Role Allocation:** Debbie

###  CI/CD
* **Relevance:** `CI/CD` (Continuous Integration / Continuous Deployment) automates testing and deployment, allowing us to ship features faster and more reliably.
* **Technical Feasibility:** High. This is a standard, essential development practice. `Point 5` will elaborate on CI/CD.
* **Role Allocation:** Kailash

### Full-Text Search for Questions

*   **Relevance:** This feature significantly enhances the user experience by allowing users to find questions by searching for keywords, phrases, or concepts within the question titles and descriptions. This is much more powerful than the existing topic-based filter and allows users to quickly find specific problems they want to practice.

*   **Technical Feasibility:** High. This feature requires coordinated changes on both the backend and frontend.
    *   **Backend:** `GET /questions/search` will be added to the Question Service. This endpoint will accept a search query string. It will leverage PostgreSQL's built-in full-text search capabilities. Specifically, it will use the `websearch_to_tsquery` function, which converts a user-friendly search string into a `tsquery` that can be efficiently matched against a `tsvector` column (a pre-indexed, searchable version of the question text).
    *   **Frontend:** A search bar will be added to the question bank page. When the user types a query and submits, the frontend will call the new `GET /questions/search` endpoint. The existing `QuestionBankTable` will be updated to display the search results returned by the API.

*   **Role Allocation:** Yi Ling

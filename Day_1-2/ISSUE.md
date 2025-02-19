
ISSUSEs:

1. "/data" was un-used and also have data which couldn't be accessed. At the same time, "apiData" was never
used and left null.
Fix: I used that endpoint, to fetch category infos inside the "apiData" DOM element thus making it useful.  

2. Exposure risk for having TOKEN_KEY and API_URL in client side code.
Possible fix: Moving them to the server, since "dotenv" cannot be used in client-side

3. Vulnerable to CSRF / XSS attacks

4. In-Memory Data Storage: The users and tasks are stored in memory. This data will be lost when the server restarts. A database should be used for persistent storage (do not use localstorage).

5. User ID Generation: User IDs are generated based on the length of the users array. This is not a robust or scalable solution. A UUID should be used instead.

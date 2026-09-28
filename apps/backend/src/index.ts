// Must be the first import so env vars exist before other modules read them.
import "dotenv/config";
import { app } from "./app.js";

// Defaults to 8000, which is where the frontend looks when NEXT_PUBLIC_API_URL is unset.
const port = Number(process.env.PORT) || 8000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

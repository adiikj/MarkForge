// Must be the first import so env vars exist before other modules read them.
import "dotenv/config";
import { app } from "./app.js";

// connectDB().then(()=>{
//     app.on("error",()=>{
//         console.error("Error in starting the server");
//         throw error;
//     });

//     app.listen(process.env.PORT,()=>{
//         console.log(`Server is running on port ${process.env.PORT}`);
//     });
// })
// .catch((error)=>{
//     console.error("Error in connecting to the database");
//     throw error;
// });

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

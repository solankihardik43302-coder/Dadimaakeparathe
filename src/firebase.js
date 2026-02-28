import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDsZlEewUffhKLbwkdEVqvU2xEZkg9Psto",
  authDomain: "dadi-maa-ke--parathe.firebaseapp.com",
  databaseURL: "https://dadi-maa-ke--parathe-default-rtdb.firebaseio.com/",
  projectId: "dadi-maa-ke--parathe",
  storageBucket: "dadi-maa-ke--parathe.firebasestorage.app",
  messagingSenderId: "335739839780",
  appId: "1:335739839780:web:455b31a3443e072db57fb1"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
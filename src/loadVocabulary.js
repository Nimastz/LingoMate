// loadVocabulary.js
import { db } from './firebaseConfig';
import vocabList from './vocabList.json';
import { collection, getDocs, addDoc } from "firebase/firestore";

export async function initializeVocabularyIfNeeded() {
  const vocabRef = collection(db, "VocabularyList");
  const snapshot = await getDocs(vocabRef);

  // Check if vocab already exists
  if (!snapshot.empty) {
    console.log("Vocabulary already initialized.");
    return;
  }

  console.log("Initializing vocabulary...");

  // Upload each word
  for (let item of vocabList) {
    await addDoc(vocabRef, {
      word: item.word,
      level: item.level,
    });
  }

  console.log("Vocabulary initialization complete.");
}
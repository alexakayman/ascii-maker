import * as child_process from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = promisify(
  (
    question: string,
    callback: (error: Error | undefined, result: string) => void
  ) => rl.question(question, (answer) => callback(undefined, answer))
);

// Promisify exec for cleaner async usage
const exec = promisify(child_process.exec);

async function addAudioToVideo(youtubeUrl: string): Promise<void> {
  const tempDir = "./temp_audio";
  const audioPath = path.join(tempDir, "audio.m4a");
  const inputVideoPath = "./ascii_video.mp4";
  const outputVideoPath = "./ascii_video_with_audio.mp4";

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Check if ASCII video exists
    if (!fs.existsSync(inputVideoPath)) {
      throw new Error(
        "ASCII video not found. Please generate it first using main.ts"
      );
    }

    console.log("Downloading audio from YouTube...");
    await exec(
      `yt-dlp -f "bestaudio[ext=m4a]" -o "${audioPath}" ${youtubeUrl}`
    );

    console.log("Combining audio with ASCII video...");
    await exec(
      `ffmpeg -i "${inputVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -shortest "${outputVideoPath}"`
    );

    console.log("Cleaning up temporary files...");
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log(`Success! Video with audio saved as: ${outputVideoPath}`);
  } catch (error) {
    console.error("Error:", error);
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } finally {
    rl.close();
  }
}

// Main execution
console.log(
  "This script will add audio from a YouTube video to your ASCII video."
);
console.log("Make sure ascii_video.mp4 exists in the current directory.");
console.log("The output will be saved as ascii_video_with_audio.mp4\n");

const url = await question("Enter YouTube URL for audio source: ");
await addAudioToVideo(url);

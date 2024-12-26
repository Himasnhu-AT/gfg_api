import axios from "axios";
import * as cheerio from "cheerio";

/* 
* ERROR:
* var chalk_1 = require("chalk");
              ^

* Error [ERR_REQUIRE_ESM]: require() of ES Module /Users/himanshu/codes/gfg/node_modules/.pnpm/chalk@5.4.1/node_modules/chalk/source/index.js from /Users/himanshu/codes/gfg/index.js not supported.
* Instead change the require of /Users/himanshu/codes/gfg/node_modules/.pnpm/chalk@5.4.1/node_modules/chalk/source/index.js in /Users/himanshu/codes/gfg/index.js to a dynamic import() which is available in all CommonJS modules.
*     at Object.<anonymous> (/Users/himanshu/codes/gfg/index.js:41:15) {
*   code: 'ERR_REQUIRE_ESM'
* }
*/
// let chalk: any;
// (async () => {
//   chalk = await import("chalk");
// })();

interface GFGUserData {
  instituteName: string;
  languages: string;
  rank: string;
  streak: string;
  overallScore: string;
  monthlyScore: string;
  totalSolved: string;
  easy: string[];
  medium: string[];
  hard: string[];
  heatmap?: {
    date: string;
    contributions: number;
  }[];
}

class Logger {
  static info(message: string) {
    // console.log(chalk.blue(`[INFO] ${message}`));
    console.log(`[INFO] ${message}`);
  }

  static success(message: string) {
    // console.log(chalk.green(`[SUCCESS] ${message}`));
    console.log(`[SUCCESS] ${message}`);
  }

  static error(message: string) {
    console.log(`[ERROR] ${message}`);
    // console.log(chalk.red(`[ERROR] ${message}`));
  }

  static debug(message: string, data?: any) {
    console.log(`[DEBUG] ${message}`);
    // console.log(chalk.yellow(`[DEBUG] ${message}`));
    if (data) {
      console.log(JSON.stringify(data, null, 2));
      //   console.log(chalk.gray(JSON.stringify(data, null, 2)));
    }
  }
}

async function fetchGFGProfile(userName: string): Promise<GFGUserData | null> {
  try {
    Logger.info(`Starting fetch for user: ${userName}`);

    // Fetch the main profile page
    Logger.info("Fetching profile page...");
    const response = await axios.get(
      `https://www.geeksforgeeks.org/user/${userName}/`
    );

    if (response.status !== 200) {
      Logger.error(`Failed to fetch profile. Status: ${response.status}`);
      return null;
    }

    Logger.success("Profile page fetched successfully");
    const $ = cheerio.load(response.data);

    // Extract data with error handling
    const extractWithLogging = (selector: string, description: string) => {
      try {
        const element = $(selector);
        if (!element.length) {
          Logger.error(`${description} not found with selector: ${selector}`);
          return "";
        }
        const value = element.text().trim();
        Logger.debug(`Extracted ${description}:`, value);
        return value;
      } catch (error) {
        Logger.error(`Error extracting ${description}: ${error}`);
        return "";
      }
    };

    // Extract problem lists
    const extractProblems = (selector: string, difficulty: string) => {
      try {
        const problems: string[] = [];
        $(selector)
          .find("a")
          .each((_, elem) => {
            problems.push($(elem).text().trim());
          });
        Logger.debug(`Extracted ${difficulty} problems:`, problems);
        return problems;
      } catch (error) {
        Logger.error(`Error extracting ${difficulty} problems: ${error}`);
        return [];
      }
    };

    Logger.info("Extracting user data...");
    const userData: GFGUserData = {
      rank: extractWithLogging(
        ".profilePicSection_head_userRankContainer_rank__abngM b",
        "rank"
      ),
      streak: extractWithLogging(
        ".circularProgressBar_head_mid_streakCnt__MFOF1",
        "streak"
      ),
      overallScore: extractWithLogging(
        ".scoreCards_head__G_uNQ div:nth-child(1) span.score_card_value",
        "overall score"
      ),
      monthlyScore: extractWithLogging(
        ".scoreCards_head__G_uNQ div:nth-child(3) span.score_card_value",
        "monthly score"
      ),
      totalSolved: extractWithLogging(
        ".scoreCards_head__G_uNQ div:nth-child(2) span.score_card_value",
        "total solved"
      ),
      instituteName: extractWithLogging(
        ".educationDetails_head_left--text__tgi9I",
        "institute name"
      ),
      languages: extractWithLogging(
        ".educationDetails_head_right--text__lLOHI",
        "languages"
      ),
      easy: extractProblems(
        ".problemListSection_head__JAiP6 > div:nth-child(1)",
        "easy"
      ),
      medium: extractProblems(
        ".problemListSection_head__JAiP6 > div:nth-child(2)",
        "medium"
      ),
      hard: extractProblems(
        ".problemListSection_head__JAiP6 > div:nth-child(3)",
        "hard"
      ),
    };

    // Fetch contributions/heatmap data
    Logger.info("Fetching contribution data...");
    const contributionsResponse = await axios.get(
      `https://auth.geeksforgeeks.org/user/${userName}/profile`
    );

    if (contributionsResponse.status === 200) {
      const $contributions = cheerio.load(contributionsResponse.data);
      const heatmap: { date: string; contributions: number }[] = [];

      $contributions(".activity-box").each((_, elem) => {
        const date = $contributions(elem).attr("data-date") || "";
        const count = parseInt($contributions(elem).attr("data-count") || "0");
        heatmap.push({ date, contributions: count });
      });

      userData.heatmap = heatmap;
      Logger.debug("Extracted heatmap data:", heatmap);
    }

    // Check recent activity
    const today = new Date();
    const threeDaysAgo = new Date(today.setDate(today.getDate() - 3));

    const hasRecentActivity = userData.heatmap?.some((day) => {
      const contributionDate = new Date(day.date);
      return contributionDate >= threeDaysAgo && day.contributions > 0;
    });

    Logger.success("Data extraction completed");
    Logger.info(`Recent activity (last 3 days): ${hasRecentActivity}`);
    console.log("\nUser Statistics:");
    console.log("----------------");
    console.log(`Rank: ${userData.rank}`);
    console.log(`Current Streak: ${userData.streak}`);
    console.log(`Overall Score: ${userData.overallScore}`);
    console.log(`Problems Solved: ${userData.totalSolved}`);
    console.log(`Monthly Score: ${userData.monthlyScore}`);
    console.log(`Recent Activity: ${hasRecentActivity}`);

    return userData;
  } catch (error) {
    Logger.error(`Failed to fetch profile: ${error}`);
    return null;
  }
}

// Example usage
const username = "devansh151005";
Logger.info(`Starting profile analysis for ${username}`);
fetchGFGProfile(username)
  .then((data) => {
    if (data) {
      Logger.success("Profile analysis completed successfully");
    } else {
      Logger.error("Failed to analyze profile");
    }
  })
  .catch((error) => {
    Logger.error(`Unexpected error: ${error}`);
  });

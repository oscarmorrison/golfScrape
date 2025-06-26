# Golf Australia Top-100 Courses Scraper

A Node.js web scraper that extracts all golf course information from the Golf Australia Top-100 Courses for 2024 ranking page.

## Features

- Extracts course names, locations, designers, average points, 2022 rankings, and comments
- Saves data to JSON format for easy analysis
- Handles dynamic content loading
- Provides console output with sample results

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the scraper:
```bash
npm start
```

## Output

The scraper generates a `golf-courses-2024.json` file containing:

- Source information and timestamp
- Total number of courses found
- Array of course objects with:
  - `name`: Course name
  - `location`: Course location
  - `designers`: Course designers
  - `averagePoints`: Average points score
  - `ranking2022`: 2022 ranking position
  - `comments`: Array of judge comments

## Sample Output Structure

```json
{
  "source": "Golf Australia Top-100 Courses 2024",
  "url": "https://www.golfaustralia.com.au/feature/ranking-australias-top-100-courses-for-2024-604333/page0",
  "scrapedAt": "2024-01-24T10:30:00.000Z",
  "totalCourses": 100,
  "courses": [
    {
      "name": "ROYAL MELBOURNE GC – WEST COURSE",
      "location": "Black Rock, Victoria",
      "designers": "Dr Alister MacKenzie (1931); Tom Doak – Renaissance Golf Design (ongoing)",
      "averagePoints": "99.909",
      "ranking2022": "1",
      "comments": [
        "Royal Melbourne West is still the best course in the land...",
        "The brilliance of the West Course is it demands the highest levels..."
      ]
    }
  ]
}
```

## Requirements

- Node.js (v14 or higher)
- Internet connection to access the Golf Australia website

## Notes

- The scraper uses Puppeteer to handle JavaScript-rendered content
- Browser will open in non-headless mode for debugging
- If the page structure changes, the scraper may need updates
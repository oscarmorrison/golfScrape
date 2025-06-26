const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeGolfCourses() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        console.log('Navigating to Golf Australia Top-100 Courses page...');
        await page.goto('https://www.golfaustralia.com.au/feature/ranking-australias-top-100-courses-for-2024-604333/page0', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Page loaded, extracting course information...');

        const courses = await page.evaluate(() => {
            const courses = [];
            const textContent = document.body.textContent;

            const courseBlocks = textContent.split(/(?=^[A-Z][A-Z\s&]+$)/m);

            for (const block of courseBlocks) {
                const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                if (lines.length < 3) continue;

                const courseName = lines[0];
                if (!courseName || courseName.length > 100 || courseName.includes('©') || courseName.includes('PHOTO:')) continue;

                let location = '';
                let designers = '';
                let averagePoints = '';
                let ranking2022 = '';
                let comments = [];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i];

                    if (line.includes(',') && !location && !line.includes('Designer') && !line.includes('Average') && !line.includes('2022')) {
                        location = line;
                    } else if (line.includes('Designer:') || line.includes('Designers:')) {
                        const designerMatch = line.match(/Designer[s]?:\s*(.+)/);
                        if (designerMatch) {
                            designers = designerMatch[1];
                        }
                    } else if (line.includes('Average points:')) {
                        const pointsMatch = line.match(/Average points:\s*([\d.]+)/);
                        if (pointsMatch) {
                            averagePoints = pointsMatch[1];
                        }
                    } else if (line.includes('2022 ranking:')) {
                        const rankingMatch = line.match(/2022 ranking:\s*(.+)/);
                        if (rankingMatch) {
                            ranking2022 = rankingMatch[1];
                        }
                    } else if (line.startsWith('"') && line.endsWith('"')) {
                        comments.push(line.replace(/^"|"$/g, ''));
                    }
                }

                if (courseName && (designers || averagePoints)) {
                    courses.push({
                        name: courseName,
                        location: location,
                        designers: designers,
                        averagePoints: averagePoints,
                        ranking2022: ranking2022,
                        comments: comments
                    });
                }
            }

            return courses;
        });

        console.log(`Found ${courses.length} courses. Trying alternative extraction method...`);

        const alternativeCourses = await page.evaluate(() => {
            const courses = [];
            const elements = document.querySelectorAll('p, div, h3, h4, h5, h6');

            let currentCourse = null;

            for (const element of elements) {
                const text = element.textContent.trim();

                if (text.includes('Designer:') && text.includes('Average points:')) {
                    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                    let courseName = '';
                    let location = '';
                    let designers = '';
                    let averagePoints = '';
                    let ranking2022 = '';
                    let comments = [];

                    for (const line of lines) {
                        if (line.includes('Designer:') || line.includes('Designers:')) {
                            const designerMatch = line.match(/Designer[s]?:\s*(.+)/);
                            if (designerMatch) {
                                designers = designerMatch[1];
                            }
                        } else if (line.includes('Average points:')) {
                            const pointsMatch = line.match(/Average points:\s*([\d.]+)/);
                            if (pointsMatch) {
                                averagePoints = pointsMatch[1];
                            }
                        } else if (line.includes('2022 ranking:')) {
                            const rankingMatch = line.match(/2022 ranking:\s*(.+)/);
                            if (rankingMatch) {
                                ranking2022 = rankingMatch[1];
                            }
                        } else if (line.startsWith('"') && line.endsWith('"')) {
                            comments.push(line.replace(/^"|"$/g, ''));
                        } else if (line.length > 0 && line.length < 100 && !line.includes('PHOTO:') && !line.includes('©')) {
                            if (!courseName) {
                                courseName = line;
                            } else if (!location && line.includes(',')) {
                                location = line;
                            }
                        }
                    }

                    if (courseName && designers) {
                        courses.push({
                            name: courseName,
                            location: location,
                            designers: designers,
                            averagePoints: averagePoints,
                            ranking2022: ranking2022,
                            comments: comments
                        });
                    }
                }
            }

            return courses;
        });

        console.log(`Alternative method found ${alternativeCourses.length} courses`);

        const finalCourses = alternativeCourses.length > 0 ? alternativeCourses : courses;

        const output = {
            source: 'Golf Australia Top-100 Courses 2024',
            url: 'https://www.golfaustralia.com.au/feature/ranking-australias-top-100-courses-for-2024-604333/page0',
            scrapedAt: new Date().toISOString(),
            totalCourses: finalCourses.length,
            courses: finalCourses
        };

        fs.writeFileSync('golf-courses-2024.json', JSON.stringify(output, null, 2));
        console.log(`Successfully scraped ${finalCourses.length} golf courses`);
        console.log('Data saved to golf-courses-2024.json');

        if (finalCourses.length > 0) {
            console.log('\nFirst few courses:');
            finalCourses.slice(0, 5).forEach((course, index) => {
                console.log(`\n${index + 1}. ${course.name}`);
                console.log(`   Location: ${course.location}`);
                console.log(`   Designers: ${course.designers}`);
                console.log(`   Average Points: ${course.averagePoints}`);
                console.log(`   2022 Ranking: ${course.ranking2022}`);
                if (course.comments.length > 0) {
                    console.log(`   Comments: ${course.comments[0]}`);
                }
            });
        } else {
            console.log('No courses found. The page structure might have changed.');
        }

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        await browser.close();
    }
}

scrapeGolfCourses();
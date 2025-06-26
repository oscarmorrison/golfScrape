import puppeteer from 'puppeteer';
import fs from 'fs';

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
            const paragraphs = Array.from(document.querySelectorAll('p'));
            const articleImages = Array.from(document.querySelectorAll('div.ArticleImage'));
            const courses = [];
            let i = 0;
            let articleImgIdx = 0;
            while (i < paragraphs.length) {
                const p = paragraphs[i];
                const html = p.innerHTML;
                const text = p.textContent.trim();
                // Detect course start
                if (html.includes('<img') && html.includes('font-size:20px')) {
                    const course = {};
                    // Ranking from image URL
                    const imgMatch = html.match(/Features%2f(\d+)\.jpg/);
                    if (imgMatch) {
                        course.ranking = parseInt(imgMatch[1]);
                    }
                    // Name
                    const nameMatch = text.match(/^([A-Z][A-Z\s&–.]+)/);
                    if (nameMatch) {
                        course.name = nameMatch[1].trim();
                    } else {
                        course.name = text;
                    }
                    // Location (next p)
                    i++;
                    if (i < paragraphs.length) {
                        course.location = paragraphs[i].textContent.trim();
                    }
                    // Designers (next p)
                    i++;
                    if (i < paragraphs.length) {
                        const designersText = paragraphs[i].textContent.trim();
                        const designerMatch = designersText.match(/Designer[s]?:\s*(.+)/);
                        course.designers = designerMatch ? designerMatch[1].trim() : designersText;
                    }
                    // Average points and 2022 ranking (next p)
                    i++;
                    if (i < paragraphs.length) {
                        const pointsText = paragraphs[i].textContent.trim();
                        const pointsMatch = pointsText.match(/Average points:\s*([\d.]+)/);
                        course.averagePoints = pointsMatch ? parseFloat(pointsMatch[1]) : null;
                        const rankingMatch = pointsText.match(/2022 ranking:\s*([^\.]+)\.?/);
                        course.ranking2022 = rankingMatch ? rankingMatch[1].trim() : null;
                    }
                    // Comments (next p, may be multiple)
                    i++;
                    course.comments = [];
                    // First comment block may start with 'Comments:'
                    if (i < paragraphs.length && paragraphs[i].innerHTML.includes('Comments:')) {
                        let commentBlock = paragraphs[i].innerHTML;
                        // Extract all <em>author</em> and comment text before it
                        const commentRegex = /"([^"]+)"\s*<em>–\s*([^<]+)<\/em>/g;
                        let match;
                        while ((match = commentRegex.exec(commentBlock)) !== null) {
                            course.comments.push({ text: match[1].trim(), author: match[2].trim() });
                        }
                        i++;
                    }
                    // Additional comments (each in their own <p>, ending with <em>– Author.</em>)
                    while (i < paragraphs.length && paragraphs[i].innerHTML.includes('<em>–')) {
                        const commentHtml = paragraphs[i].innerHTML;
                        const commentMatch = commentHtml.match(/"([^"]+)"\s*<em>–\s*([^<]+)<\/em>/);
                        if (commentMatch) {
                            course.comments.push({ text: commentMatch[1].trim(), author: commentMatch[2].trim() });
                        }
                        i++;
                    }
                    // Check for following ArticleImage div (not always present)
                    let foundArticleImage = false;
                    if (articleImgIdx < articleImages.length) {
                        const articleDiv = articleImages[articleImgIdx];
                        // Find the closest paragraph index after the course block
                        const divRect = articleDiv.getBoundingClientRect();
                        const pRect = p.getBoundingClientRect();
                        if (divRect.top > pRect.top) {
                            const imgTag = articleDiv.querySelector('img');
                            const captionDiv = articleDiv.querySelector('.ArticleImageCaption');
                            if (imgTag) {
                                course.articleImageUrl = imgTag.src;
                            }
                            if (captionDiv) {
                                course.articleImageCaption = captionDiv.textContent.trim();
                            }
                            foundArticleImage = true;
                            articleImgIdx++;
                        }
                    }
                    courses.push(course);
                    continue;
                }
                i++;
            }
            return courses;
        });

        console.log(`Found ${courses.length} courses`);

        const output = {
            source: 'Golf Australia Top-100 Courses 2024',
            url: 'https://www.golfaustralia.com.au/feature/ranking-australias-top-100-courses-for-2024-604333/page0',
            articleDate: 'Jan 24 2024 1:35PM',
            scrapedAt: new Date().toISOString(),
            totalCourses: courses.length,
            courses: courses
        };

        fs.writeFileSync('golf-australia/golf-courses-2024.json', JSON.stringify(output, null, 2));
        console.log(`Successfully scraped ${courses.length} golf courses`);
        console.log('Data saved to golf-australia/golf-courses-2024.json');

        if (courses.length > 0) {
            console.log('\nFirst few courses:');
            courses.slice(0, 5).forEach((course, index) => {
                console.log(`\n${index + 1}. ${course.name} (Rank: ${course.ranking})`);
                console.log(`   Location: ${course.location}`);
                console.log(`   Designers: ${course.designers}`);
                console.log(`   Average Points: ${course.averagePoints}`);
                console.log(`   2022 Ranking: ${course.ranking2022}`);
                if (course.comments && course.comments.length > 0) {
                    console.log(`   Comments:`);
                    course.comments.forEach(comment => {
                        console.log(`     - "${comment.text}" – ${comment.author}`);
                    });
                }
                if (course.articleImageUrl) {
                    console.log(`   Article Image: ${course.articleImageUrl}`);
                    if (course.articleImageCaption) {
                        console.log(`   Caption: ${course.articleImageCaption}`);
                    }
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
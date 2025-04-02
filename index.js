const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();


const upload = multer({ dest: 'uploads/' }); // Temporary storage
const OCR_API_KEY = process.env.OCR_API_KEY; // Your OCR.space API key
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY
// OCR Extraction Route that also passes to Claude API
app.post('/extract-and-analyze', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        // STEP 1: Extract text using OCR.space
        const form = new FormData();
        form.append('apikey', OCR_API_KEY);
        form.append('file', fs.createReadStream(req.file.path));
        form.append('language', 'eng');
        form.append('isTable', 'true');
        form.append('filetype', 'pdf');

        const ocrResponse = await axios.post('https://api.ocr.space/parse/image', form, {
            headers: form.getHeaders(),
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        });

        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);

        // Check for OCR errors
        if (ocrResponse.data.IsErroredOnProcessing) {
            return res.status(500).json({
                error: 'OCR processing failed',
                details: ocrResponse.data.ErrorMessage
            });
        }

        // Extract text from OCR response
        const extractedText = ocrResponse.data.ParsedResults?.map(r => r.ParsedText).join('\n') || 'No text extracted';

        // STEP 2: Pass the extracted text directly to Claude API
        const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `${extractedText}

You are an AI assistant specializing in industrial energy analysis and solar energy adoption recommendations. Your task is to analyze the provided industrial energy consumption data and create a comprehensive report with recommendations for solar energy adoption.

First, review the industrial energy data provided above.

Please follow these steps to complete your analysis. For each step, wrap your thought process inside <thought_process> tags before providing the final output for that step.

1. Bill Analysis:
 Inside <thought_process> tags:
 - List out key metrics from the industrial electricity bills, including total consumption, peak/off-peak usage, and cost per unit.
 - Note any patterns or trends you observe in the billing data.
 - Highlight any unusual spikes or dips in energy consumption.
 Provide a brief summary of your findings from the bill analysis.

2. Hourly Usage Calculation:
 Inside <thought_process> tags:
 - List out hourly energy consumption patterns for the entire month.
 - Calculate and note the average energy usage per hour.
 - Identify and list peak usage hours and any patterns in consumption.
 - Consider possible consumer behaviors affecting these patterns.
 Present a clear breakdown of hourly usage, including the average consumption per hour and any notable patterns or peak usage times.

3. Solar Panel Comparison:
 Inside <thought_process> tags:
 - Use the provided solar panel specifications and location information to simulate potential solar power generation. List out key factors and assumptions.
 - Compare this potential output against the calculated hourly consumption, noting any discrepancies or matches.
 - Calculate and list the monthly cost savings by offsetting grid electricity with solar power.
 - Consider and list factors that might affect solar panel efficiency or output in this specific case.
 Present your findings on potential solar energy output, cost savings, and how well it matches the facility's energy needs.

4. Environmental Impact Report:
 Inside <thought_process> tags:
 - Calculate and list the potential reduction in carbon footprint by adopting solar energy.
 - Research and list other environmental benefits of solar adoption for this specific case.
 - Calculate and note the equivalent reduction in fossil fuel usage or other relevant metrics.
 Provide a clear report on the environmental benefits of solar adoption, including specific metrics and comparisons where possible.

5. Final Summary and Recommendations:
 Inside <thought_process> tags:
 - List key points from all the data and analyses from the previous steps.
 - Note financial, operational, and environmental aspects of solar adoption for this facility.
 - List any potential challenges or areas that require further investigation.
 - Develop and list clear, actionable recommendations based on your analysis.

 Compile your final summary and recommendations within <analysis_report> tags. Your report should include:
 - A brief overview of the current energy consumption situation
 - Key findings from each analysis step
 - Clear recommendations on whether the industrial facility should adopt solar energy
 - Suggested next steps or additional considerations for optimizing energy usage

 Ensure that your report is well-structured, easy to read, and provides actionable insights for decision-makers.`
                        }
                    ]
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            }
        });

        // Extract Claude's response
        const analysisResult = claudeResponse.data.content[0].text;

        // Return both the OCR text and Claude's analysis
        res.json({
            success: true,
            extractedText: extractedText,
            analysis: analysisResult
        });

    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({
            error: 'Processing failed',
            details: error.message
        });
    }
});

// For direct text analysis without OCR
app.post('/analyze-text', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided for analysis' });
        }

        // Pass the text directly to Claude API
        const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-7-sonnet-20250219",
            max_tokens: 4000,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `${text}

You are an AI assistant specializing in industrial energy analysis and solar energy adoption recommendations. Your task is to analyze the provided industrial energy consumption data and create a comprehensive report with recommendations for solar energy adoption.

First, review the industrial energy data provided above.

Please follow these steps to complete your analysis. For each step, wrap your thought process inside <thought_process> tags before providing the final output for that step.

1. Bill Analysis:
 Inside <thought_process> tags:
 - List out key metrics from the industrial electricity bills, including total consumption, peak/off-peak usage, and cost per unit.
 - Note any patterns or trends you observe in the billing data.
 - Highlight any unusual spikes or dips in energy consumption.
 Provide a brief summary of your findings from the bill analysis.

2. Hourly Usage Calculation:
 Inside <thought_process> tags:
 - List out hourly energy consumption patterns for the entire month.
 - Calculate and note the average energy usage per hour.
 - Identify and list peak usage hours and any patterns in consumption.
 - Consider possible consumer behaviors affecting these patterns.
 Present a clear breakdown of hourly usage, including the average consumption per hour and any notable patterns or peak usage times.

3. Solar Panel Comparison:
 Inside <thought_process> tags:
 - Use the provided solar panel specifications and location information to simulate potential solar power generation. List out key factors and assumptions.
 - Compare this potential output against the calculated hourly consumption, noting any discrepancies or matches.
 - Calculate and list the monthly cost savings by offsetting grid electricity with solar power.
 - Consider and list factors that might affect solar panel efficiency or output in this specific case.
 Present your findings on potential solar energy output, cost savings, and how well it matches the facility's energy needs.

4. Environmental Impact Report:
 Inside <thought_process> tags:
 - Calculate and list the potential reduction in carbon footprint by adopting solar energy.
 - Research and list other environmental benefits of solar adoption for this specific case.
 - Calculate and note the equivalent reduction in fossil fuel usage or other relevant metrics.
 Provide a clear report on the environmental benefits of solar adoption, including specific metrics and comparisons where possible.

5. Final Summary and Recommendations:
 Inside <thought_process> tags:
 - List key points from all the data and analyses from the previous steps.
 - Note financial, operational, and environmental aspects of solar adoption for this facility.
 - List any potential challenges or areas that require further investigation.
 - Develop and list clear, actionable recommendations based on your analysis.

 Compile your final summary and recommendations within <analysis_report> tags. Your report should include:
 - A brief overview of the current energy consumption situation
 - Key findings from each analysis step
 - Clear recommendations on whether the industrial facility should adopt solar energy
 - Suggested next steps or additional considerations for optimizing energy usage

 Ensure that your report is well-structured, easy to read, and provides actionable insights for decision-makers.`
                        }
                    ]
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            }
        });

        // Extract Claude's response
        const analysisResult = claudeResponse.data.content[0].text;

        // Return Claude's analysis
        res.json({
            success: true,
            analysis: analysisResult
        });

    } catch (error) {
        console.error('Analysis Error:', error.message);
        res.status(500).json({
            error: 'Analysis failed',
            details: error.message
        });
    }
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const PORT = 3000;
app.listen(PORT, () => console.log(`✅ OCR & Claude API running on http://localhost:${PORT}`));

/* 
USAGE EXAMPLES:

1. For PDF extraction and analysis:
   curl -X POST -F "file=@your_bill.pdf" http://localhost:3000/extract-and-analyze

2. For direct text analysis (if you already have the OCR text):
   curl -X POST -H "Content-Type: application/json" -d '{"text":"EASTERN POWER DISTRIBUTION COMPANY..."}' http://localhost:3000/analyze-text
*/
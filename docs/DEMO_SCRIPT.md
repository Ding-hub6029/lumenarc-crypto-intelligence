# Simple video script

## Video rules

Make a video of about five minutes.

Show your face and your computer screen at the same time.

Do not make the video longer than eight minutes. The teacher will only check the first eight minutes.

Speak slowly. Use short sentences. Show the screen when you talk about a feature.

Do not show an API key, secret card, or private file in the video.

## Before you record

1. Open the LumenArc app.
2. Open Overview. Wait until the market says Live.
3. Check that ten coin prices are shown.
4. Import the sample PDF before recording if your internet is slow.
5. Open `eval/results/holdout_summary.json` in another window.
6. Keep the PDF source page ready.

## Easy speaking script

### 0:00 to 0:30

Hello. My name is Ding Xiangfeng.

This is LumenArc. It is an AI tool for crypto research.

A research analyst may need to read many long PDF reports.

My tool helps the user find an answer in a report.

It shows the source and page number.

If the report does not have the answer, the tool says it does not have enough evidence.

It does not give trading advice. It does not predict prices.

### 0:30 to 1:25

Now I will show the Research desk.

This is a real research PDF.

The system reads the PDF page by page.

It splits the text into small parts. These parts are called passages.

Now I ask a simple question from this report.

The system gives an answer. It also shows the source passage and page number.

This is important. The user can check the answer in the original PDF.

The system does not show a made-up confidence score like 90 percent.

It uses simple evidence labels. For example, Supported means the answer has source support.

### 1:25 to 2:05

Now I ask a question that this PDF does not answer.

The system says Insufficient evidence.

This is better than making up a number.

I can also use the keyword baseline.

The keyword baseline finds a close sentence. But it does not use AI to explain the answer.

A close sentence is not always the right answer. That is why I compare the two methods.

### 2:05 to 2:55

Now I return to Overview.

Here are ten live crypto prices.

The prices come from Binance Spot.

They change when the exchange sends new trade events.

This is not a one-minute screenshot.

The prices use USDT. They are not exact US dollar prices.

I can see the last update time and the connection status.

Now I click Analyze live market.

This gives one short AI summary of the current ten prices.

It uses the price data shown at this time.

It is not a price forecast. It is not trading advice.

### 2:55 to 3:25

Now I open News intelligence.

I can search for a crypto topic.

The app gets recent news headlines and short feed text.

If I use the AI news button, the AI only sees the headline and short text.

It does not say that it read a full news article when it did not.

### 3:25 to 3:50

Now I click this button to change the language.

The app can switch between English and Chinese.

I chose React for the screen and Node for the server.

At first, I thought about using Streamlit because it is fast to build.

But React and Node gave me a better user interface, better document state, and a safer place for the AI key.

The browser does not see the AI key.

### 3:50 to 4:35

Now I will show my test result.

I used 30 real research reports.

I used 12 development questions to choose the system settings.

Then I froze a different test set with 50 questions.

The final AI system answered 37 of 40 number questions with the right number and source.

This is 92.5 percent.

For 10 questions with no answer in the report, the system correctly refused all 10.

For the 40 questions that did have an answer, the system wrongly refused 3.

I show both good refusals and wrong refusals. A system that refuses every question is not useful.

The final test used Project AI.

It did not use the school OpenRouter key because the protected key setup was not confirmed.

### 4:35 to 5:00

There are some limits.

The 50 test labels were checked against text from the PDF. They were not all checked by a human one by one.

All 30 reports came from one publisher.

PDF tables can lose their layout when text is read.

The uploaded files stay only in temporary server memory.

I did not measure human work time, so I do not claim that the tool saves 40 percent of time.

Thank you for watching.

## Important sentences to avoid

Do not say the app can predict crypto prices.

Do not say the app gives trading advice.

Do not say Supported means 90 percent confidence.

Do not say all 50 test labels were checked by people.

Do not say the final test used the school OpenRouter key.

Do not say the tool saves 40 percent of analyst time.

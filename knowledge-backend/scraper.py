"""
Genesys Documentation Scraper
Fetches and processes Genesys help articles for the knowledge base.
"""

import json
import hashlib
import re
from datetime import datetime
from typing import List, Dict, Optional
import requests
from bs4 import BeautifulSoup
import time
import os

# Target URLs for Genesys documentation
GENESYS_URLS = [
    # Agent Copilot articles
    "https://help.mypurecloud.com/articles/about-agent-copilot/",
    "https://help.mypurecloud.com/articles/configure-agent-copilot/",
    "https://help.mypurecloud.com/articles/agent-copilot-faqs/",
    "https://help.mypurecloud.com/articles/use-agent-copilot/",
    "https://help.mypurecloud.com/articles/agent-copilot-metrics-and-analytics/",

    # AI and Automation
    "https://help.mypurecloud.com/articles/about-genesys-cloud-ai/",
    "https://help.mypurecloud.com/articles/about-knowledge-workbench/",
    "https://help.mypurecloud.com/articles/work-with-knowledge-bases/",
    "https://help.mypurecloud.com/articles/about-predictive-engagement/",
    "https://help.mypurecloud.com/articles/about-digital-bot-flows/",

    # Contact Center Setup
    "https://help.mypurecloud.com/articles/about-queues/",
    "https://help.mypurecloud.com/articles/configure-queue-settings/",
    "https://help.mypurecloud.com/articles/about-routing/",
    "https://help.mypurecloud.com/articles/about-skills-based-routing/",
    "https://help.mypurecloud.com/articles/about-wrap-up-codes/",

    # Web Messaging
    "https://help.mypurecloud.com/articles/about-web-messaging/",
    "https://help.mypurecloud.com/articles/configure-messenger/",
    "https://help.mypurecloud.com/articles/web-messaging-guest-api/",
    "https://help.mypurecloud.com/articles/messenger-deployment/",

    # Troubleshooting
    "https://help.mypurecloud.com/articles/troubleshoot-web-messaging/",
    "https://help.mypurecloud.com/articles/troubleshoot-calls/",
    "https://help.mypurecloud.com/articles/troubleshoot-quality-management/",
    "https://help.mypurecloud.com/articles/troubleshoot-integrations/",

    # Quality Management
    "https://help.mypurecloud.com/articles/about-quality-management/",
    "https://help.mypurecloud.com/articles/create-evaluation-forms/",
    "https://help.mypurecloud.com/articles/about-speech-and-text-analytics/",
    "https://help.mypurecloud.com/articles/about-coaching/",

    # Analytics and Reporting
    "https://help.mypurecloud.com/articles/about-analytics/",
    "https://help.mypurecloud.com/articles/about-performance-dashboards/",
    "https://help.mypurecloud.com/articles/about-reports/",

    # Workforce Management
    "https://help.mypurecloud.com/articles/about-workforce-management/",
    "https://help.mypurecloud.com/articles/about-scheduling/",
    "https://help.mypurecloud.com/articles/about-adherence/",

    # Integrations
    "https://help.mypurecloud.com/articles/about-integrations/",
    "https://help.mypurecloud.com/articles/about-data-actions/",
    "https://help.mypurecloud.com/articles/about-aws-integrations/",

    # Security and Compliance
    "https://help.mypurecloud.com/articles/about-security/",
    "https://help.mypurecloud.com/articles/about-hipaa-compliance/",
    "https://help.mypurecloud.com/articles/about-gdpr/",

    # Additional helpful articles
    "https://help.mypurecloud.com/articles/about-callback/",
    "https://help.mypurecloud.com/articles/about-outbound-dialing/",
    "https://help.mypurecloud.com/articles/about-scripts/",
    "https://help.mypurecloud.com/articles/about-architect/",
    "https://help.mypurecloud.com/articles/about-ivr/",
    "https://help.mypurecloud.com/articles/about-screen-recording/",
    "https://help.mypurecloud.com/articles/about-presence/",
    "https://help.mypurecloud.com/articles/about-user-management/",
]

# Category mapping based on URL patterns
CATEGORY_MAP = {
    "agent-copilot": "Agent Copilot",
    "troubleshoot": "Troubleshooting",
    "quality": "Quality Management",
    "analytics": "Analytics",
    "routing": "Routing",
    "queue": "Queues",
    "messaging": "Web Messaging",
    "workforce": "Workforce Management",
    "integration": "Integrations",
    "security": "Security",
    "bot": "Digital Bots",
    "knowledge": "Knowledge Management",
    "ai": "AI Features",
}


def get_category(url: str) -> str:
    """Determine article category from URL."""
    url_lower = url.lower()
    for pattern, category in CATEGORY_MAP.items():
        if pattern in url_lower:
            return category
    return "General"


def generate_doc_id(url: str) -> str:
    """Generate a unique document ID from URL."""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def clean_text(text: str) -> str:
    """Clean and normalize text content."""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters that might cause issues
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    return text.strip()


def fetch_article(url: str, timeout: int = 10) -> Optional[Dict]:
    """Fetch and parse a single Genesys help article."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Extract title
        title_elem = soup.find('h1') or soup.find('title')
        title = clean_text(title_elem.get_text()) if title_elem else "Untitled"

        # Extract main content - look for article body
        content_elem = (
            soup.find('article') or
            soup.find('div', class_='article-content') or
            soup.find('div', class_='content') or
            soup.find('main')
        )

        if content_elem:
            # Remove navigation, scripts, styles
            for elem in content_elem.find_all(['nav', 'script', 'style', 'header', 'footer', 'aside']):
                elem.decompose()
            content = clean_text(content_elem.get_text())
        else:
            # Fallback to body text
            content = clean_text(soup.body.get_text() if soup.body else "")

        # Skip if content is too short (likely a redirect or error page)
        if len(content) < 100:
            print(f"  Skipping {url} - content too short")
            return None

        # Truncate very long content
        if len(content) > 10000:
            content = content[:10000] + "..."

        return {
            "id": generate_doc_id(url),
            "title": title,
            "url": url,
            "content": content,
            "category": get_category(url),
            "product": "Genesys Cloud CX",
            "scraped_at": datetime.now().isoformat(),
        }

    except requests.RequestException as e:
        print(f"  Error fetching {url}: {e}")
        return None
    except Exception as e:
        print(f"  Error parsing {url}: {e}")
        return None


def scrape_genesys_docs(urls: List[str] = None, delay: float = 1.0) -> List[Dict]:
    """
    Scrape multiple Genesys documentation pages.

    Args:
        urls: List of URLs to scrape (defaults to GENESYS_URLS)
        delay: Delay between requests in seconds

    Returns:
        List of document dictionaries
    """
    if urls is None:
        urls = GENESYS_URLS

    documents = []
    total = len(urls)

    print(f"Scraping {total} Genesys documentation pages...")

    for i, url in enumerate(urls, 1):
        print(f"[{i}/{total}] Fetching: {url}")
        doc = fetch_article(url)

        if doc:
            documents.append(doc)
            print(f"  ✓ {doc['title'][:50]}... ({len(doc['content'])} chars)")

        # Be nice to the server
        if i < total:
            time.sleep(delay)

    print(f"\nScraped {len(documents)} articles successfully")
    return documents


def save_documents(documents: List[Dict], filepath: str = "data/genesys_docs.json"):
    """Save scraped documents to JSON file."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(documents, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(documents)} documents to {filepath}")


def load_documents(filepath: str = "data/genesys_docs.json") -> List[Dict]:
    """Load documents from JSON file."""
    if not os.path.exists(filepath):
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


# Sample documents for when scraping isn't possible
# B1: Expanded to 25 comprehensive articles across Agent Copilot, Routing, Quality Management, Workforce
SAMPLE_DOCUMENTS = [
    # ========== AGENT COPILOT (6 articles) ==========
    {
        "id": "sample_001",
        "title": "About Agent Copilot",
        "url": "https://help.mypurecloud.com/articles/about-agent-copilot/",
        "content": """Agent Copilot is an AI-powered feature in Genesys Cloud that provides real-time assistance to contact center agents during customer interactions. It uses natural language understanding (NLU) and machine learning to analyze conversations and provide relevant suggestions, knowledge articles, and next-best-action recommendations.

Key Features:
- Real-time response suggestions based on conversation context
- Automatic knowledge article retrieval from connected knowledge bases
- Sentiment analysis to detect customer emotions
- Next-best-action recommendations for optimal customer outcomes
- Seamless integration with Genesys Cloud desktop

Agent Copilot helps reduce average handle time (AHT), improve first contact resolution (FCR), and enhance overall customer satisfaction by empowering agents with AI-driven insights during live interactions.

Configuration Requirements:
1. Enable Agent Copilot in your organization settings
2. Connect knowledge bases for article suggestions
3. Configure NLU confidence thresholds
4. Set up agent desktop integration
5. Train the model with historical conversation data

Benefits for Contact Centers:
- 15-25% reduction in Average Handle Time
- 10-20% improvement in First Contact Resolution
- Higher agent satisfaction and reduced training time
- Consistent responses across all customer interactions""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_002",
        "title": "Configure Agent Copilot",
        "url": "https://help.mypurecloud.com/articles/configure-agent-copilot/",
        "content": """To configure Agent Copilot in Genesys Cloud:

Step 1: Enable Agent Copilot
- Navigate to Admin > Organization Settings > Features
- Enable the Agent Copilot feature toggle
- Select the queues where Agent Copilot should be active

Step 2: Configure Knowledge Sources
- Go to Admin > Knowledge > Knowledge Bases
- Select or create a knowledge base
- Enable "Use for Agent Copilot" option
- Ensure articles are published and categorized

Step 3: Set NLU Confidence Thresholds
- Navigate to Admin > AI > Agent Copilot Settings
- Set minimum confidence score (recommended: 0.7)
- Configure suggestion display rules
- Set maximum suggestions per interaction (recommended: 3-5)

Step 4: Configure Agent Desktop
- Open Admin > Contact Center > Agent Desktop
- Enable Agent Copilot panel in desktop layout
- Position the panel (right side recommended)
- Configure keyboard shortcuts for quick access

Step 5: Test and Validate
- Run test conversations with sample scenarios
- Verify suggestions appear correctly
- Check knowledge article relevance
- Adjust confidence thresholds if needed

Troubleshooting Common Issues:
- If suggestions don't appear, check NLU confidence threshold
- Verify knowledge base is properly connected
- Ensure agents have correct permissions
- Check that queues are configured for Agent Copilot""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_003",
        "title": "Troubleshoot Agent Copilot Issues",
        "url": "https://help.mypurecloud.com/articles/troubleshoot-agent-copilot/",
        "content": """Common Agent Copilot issues and solutions:

Issue: Agent Copilot suggestions not appearing
Causes and Solutions:
1. NLU confidence threshold too high
   - Navigate to Admin > AI > Agent Copilot Settings
   - Lower the confidence threshold (try 0.6)
   - Test with new conversations

2. Knowledge base not connected
   - Go to Admin > Knowledge > Knowledge Bases
   - Verify the knowledge base is enabled for Agent Copilot
   - Check article status (must be Published)

3. Queue not configured
   - Open Admin > Contact Center > Queues
   - Select the queue and enable Agent Copilot
   - Verify feature settings are saved

4. Agent permissions missing
   - Check Admin > People > Roles
   - Ensure agent role has Agent Copilot permissions
   - Verify user is assigned correct role

Issue: Irrelevant suggestions appearing
Solutions:
- Review and update knowledge base articles
- Adjust NLU model training
- Increase confidence threshold
- Add negative examples to training data

Issue: Slow suggestion response time
Solutions:
- Check network connectivity
- Verify knowledge base size (optimize if too large)
- Review integration performance
- Contact Genesys support if issues persist

Issue: Duplicate suggestions
Solutions:
- Review knowledge base for duplicate articles
- Merge similar content
- Update article categories and tags

Best Practices:
- Regularly review and update knowledge articles
- Monitor suggestion acceptance rates
- Train NLU model with new conversation patterns
- Gather agent feedback for continuous improvement""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_004",
        "title": "About Genesys Cloud Routing",
        "url": "https://help.mypurecloud.com/articles/about-routing/",
        "content": """Genesys Cloud Routing intelligently directs customer interactions to the most appropriate agent based on skills, availability, and business rules.

Routing Methods:
1. Skills-Based Routing - Match customer needs with agent skills
2. Priority Routing - Handle high-priority customers first
3. Bullseye Routing - Expand search rings until agent found
4. Preferred Agent Routing - Route to previously connected agent
5. Direct Routing - Route to specific agent or queue

Key Concepts:
- Queues: Collections of agents handling similar interactions
- Skills: Agent capabilities (language, product knowledge, etc.)
- Routing Rules: Logic determining agent selection
- Evaluation Criteria: Factors for agent matching

Configuration Steps:
1. Create queues for different interaction types
2. Define skills and assign to agents
3. Configure routing rules in Architect
4. Set up overflow and failover rules
5. Test routing logic with sample interactions

Advanced Features:
- Predictive routing using AI/ML
- Real-time queue monitoring
- Automatic skill adjustment
- Cross-queue routing
- Time-based routing rules

Performance Optimization:
- Monitor queue wait times
- Adjust routing priorities based on SLAs
- Use analytics to identify bottlenecks
- Regular review of skill assignments""",
        "category": "Routing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_005",
        "title": "About Web Messaging",
        "url": "https://help.mypurecloud.com/articles/about-web-messaging/",
        "content": """Web Messaging enables asynchronous conversations between customers and agents through your website or mobile app.

Key Benefits:
- Persistent conversation history
- Asynchronous communication (no real-time requirement)
- Rich media support (images, files, cards)
- Bot integration capability
- Seamless handoff to human agents

Components:
1. Messenger Widget - Customer-facing chat interface
2. Agent Desktop - Agent response interface
3. Message Flow - Architect flow for routing
4. Knowledge Base - Self-service content
5. Bot Integration - Automated responses

Setup Process:
1. Create Messenger deployment in Admin
2. Configure widget appearance and behavior
3. Add JavaScript snippet to website
4. Create message flow in Architect
5. Assign to queue and test

Messenger Features:
- Customizable branding (colors, logo)
- Proactive messaging triggers
- File attachment support
- Typing indicators
- Read receipts
- Conversation history

Bot Integration:
- Connect Genesys Bot Flow or third-party bots
- Configure handoff rules to human agents
- Set up intent recognition
- Create fallback responses

Best Practices:
- Set clear expectations for response time
- Use proactive messaging strategically
- Implement knowledge articles for self-service
- Monitor customer satisfaction scores
- Regular review of conversation analytics""",
        "category": "Web Messaging",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_006",
        "title": "About Quality Management",
        "url": "https://help.mypurecloud.com/articles/about-quality-management/",
        "content": """Quality Management in Genesys Cloud enables organizations to evaluate and improve agent performance through interaction reviews, coaching, and analytics.

Key Components:
1. Evaluation Forms - Customizable scorecards
2. Calibration - Ensure evaluator consistency
3. Coaching - Agent development tools
4. Speech Analytics - Automated insights
5. Screen Recording - Visual context

Evaluation Process:
1. Select interactions for review
2. Apply evaluation form criteria
3. Score agent performance
4. Provide feedback and coaching
5. Track improvement over time

Creating Evaluation Forms:
- Navigate to Admin > Quality > Forms
- Define questions and scoring criteria
- Set up weighted categories
- Configure critical question flags
- Enable auto-fail conditions

Speech and Text Analytics:
- Automatic sentiment detection
- Topic and intent identification
- Silence and overtalk detection
- Compliance keyword monitoring
- Trend analysis and reporting

Coaching Tools:
- Create coaching appointments
- Attach evaluated interactions
- Set development goals
- Track agent progress
- Schedule follow-up reviews

Best Practices:
- Evaluate representative sample of interactions
- Calibrate evaluators regularly
- Focus coaching on specific behaviors
- Use analytics to identify patterns
- Recognize top performers""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_007",
        "title": "About Knowledge Workbench",
        "url": "https://help.mypurecloud.com/articles/about-knowledge-workbench/",
        "content": """Knowledge Workbench is Genesys Cloud's built-in knowledge management system for creating, organizing, and delivering knowledge content.

Key Features:
- Article authoring and editing
- Version control and approval workflows
- Category and tag organization
- Search and discovery
- Integration with Agent Copilot

Creating Knowledge Articles:
1. Navigate to Admin > Knowledge > Workbench
2. Click "Create Article"
3. Enter title and content
4. Add categories and tags
5. Set visibility and permissions
6. Submit for review/approval
7. Publish article

Article Best Practices:
- Write clear, concise titles
- Use headers and bullet points
- Include step-by-step instructions
- Add relevant images/screenshots
- Keep content up-to-date
- Use consistent formatting

Integration Points:
- Agent Copilot: Auto-suggest articles during conversations
- Bot Flows: Self-service knowledge retrieval
- Web Widget: Customer-facing knowledge search
- External Apps: API access to knowledge

Managing Knowledge Base:
- Regular content audits
- Track article usage analytics
- Gather user feedback
- Archive outdated content
- Maintain consistent taxonomy

Search Optimization:
- Use descriptive titles
- Add relevant synonyms
- Include common misspellings
- Tag with related topics
- Structure content for scanning""",
        "category": "Knowledge Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_008",
        "title": "About Workforce Management",
        "url": "https://help.mypurecloud.com/articles/about-workforce-management/",
        "content": """Workforce Management (WFM) in Genesys Cloud helps optimize staffing levels and agent schedules to meet service level goals.

Core Functions:
1. Forecasting - Predict interaction volumes
2. Scheduling - Create optimal agent schedules
3. Adherence - Monitor schedule compliance
4. Intraday - Real-time adjustments
5. Time Off - Manage agent requests

Forecasting:
- Historical data analysis
- Pattern recognition (daily, weekly, seasonal)
- Special event handling
- Multi-channel forecasting
- Accuracy tracking

Scheduling:
- Automatic schedule generation
- Skill-based scheduling
- Break and lunch optimization
- Shift bidding support
- Schedule publishing

Adherence Monitoring:
- Real-time status tracking
- Out-of-adherence alerts
- Historical adherence reports
- Exception management
- Coaching triggers

Intraday Management:
- Compare forecast vs actual
- Reforecast based on trends
- Schedule adjustments
- Overtime/VTO management
- Queue health monitoring

Best Practices:
- Update forecasts regularly
- Balance service levels with costs
- Communicate schedule changes promptly
- Track adherence metrics consistently
- Review and optimize scheduling rules

Integration Points:
- ACD for real-time data
- Quality Management for performance
- Analytics for reporting
- HR systems for time tracking""",
        "category": "Workforce Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_009",
        "title": "Agent Copilot Metrics and Analytics",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-metrics-and-analytics/",
        "content": """Monitor and analyze Agent Copilot performance to optimize AI assistance.

Key Metrics:
1. Suggestion Acceptance Rate - % of suggestions used by agents
2. Knowledge Article Clicks - Articles accessed via Copilot
3. Response Time Impact - Effect on average handle time
4. First Contact Resolution - FCR improvement tracking
5. Customer Satisfaction - CSAT correlation

Viewing Analytics:
- Navigate to Analytics > Agent Copilot
- Select date range and filters
- View dashboard widgets
- Export data for analysis

Dashboard Components:
- Acceptance rate trend
- Top suggested articles
- Agent usage comparison
- Queue performance impact
- Sentiment correlation

Performance Analysis:
- Compare pre/post Copilot metrics
- Identify high-performing agents
- Find training opportunities
- Optimize knowledge content
- Adjust confidence thresholds

Reporting:
- Schedule automated reports
- Export to CSV/Excel
- API access for BI tools
- Custom report builder
- Share with stakeholders

Optimization Actions:
- Low acceptance rate: Review suggestion quality
- Missing suggestions: Check knowledge coverage
- Slow responses: Optimize infrastructure
- Inconsistent results: Retrain NLU model

ROI Tracking:
- Calculate AHT reduction
- Measure FCR improvement
- Track agent satisfaction
- Monitor customer feedback
- Quantify cost savings""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_010",
        "title": "Configure Queue Settings",
        "url": "https://help.mypurecloud.com/articles/configure-queue-settings/",
        "content": """Configure queues to manage how interactions are routed to agents in Genesys Cloud.

Queue Configuration Steps:
1. Navigate to Admin > Contact Center > Queues
2. Click "Create Queue" or select existing queue
3. Configure general settings
4. Set up routing and evaluation methods
5. Assign members and skills
6. Save and activate

General Settings:
- Queue Name: Descriptive identifier
- Division: Organizational unit
- Description: Purpose documentation
- Media Settings: Channels supported
- ACW Settings: After call work time

Routing Configuration:
- Evaluation Method: How to select agents
  - All Skills Matching
  - Best Available Agent
  - Sequential
  - Round Robin
- Routing Rules: Priority and filtering
- Overflow: Backup queue handling

Agent Assignment:
- Direct Members: Specific agents
- Groups: Agent groups
- Skills: Required/preferred skills
- Skill Requirements: Minimum proficiency

Advanced Settings:
- Service Level: Target answer time
- Abandon Time: Call abandonment threshold
- Auto-Answer: Automatic pickup
- Recording: Interaction recording rules
- Whisper Audio: Agent announcements

Integration Options:
- Enable Agent Copilot
- Connect knowledge bases
- Configure callbacks
- Set up chat/messaging
- Link to Architect flows

Monitoring:
- Real-time queue dashboard
- Historical reports
- Alert configuration
- SLA tracking
- Agent utilization""",
        "category": "Queues",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== ADDITIONAL AGENT COPILOT ARTICLES ==========
    {
        "id": "sample_011",
        "title": "Agent Copilot NLU Confidence Tuning",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-nlu-tuning/",
        "content": """Optimize Agent Copilot's suggestion accuracy by tuning NLU confidence thresholds.

Understanding NLU Confidence:
The NLU confidence threshold determines the minimum score required for Agent Copilot to display a suggestion. A higher threshold means more accurate but fewer suggestions; lower threshold means more suggestions but potentially less relevant.

Recommended Threshold Settings:
- Start at 0.7 (70%) for balanced accuracy
- Lower to 0.5-0.6 if suggestions rarely appear
- Raise to 0.8-0.9 for high-precision requirements

How to Adjust NLU Confidence:
1. Navigate to Admin > AI > Agent Copilot Settings
2. Find "NLU Confidence Threshold" slider
3. Adjust value (0.0 to 1.0)
4. Click Save
5. Test with sample conversations

Troubleshooting Low Suggestion Rates:
- If suggestions rarely appear, threshold may be too high
- Check knowledge base content quality
- Ensure articles match common customer queries
- Review conversation patterns in Analytics

Troubleshooting Irrelevant Suggestions:
- If suggestions are off-topic, threshold may be too low
- Review and improve knowledge base articles
- Add negative examples to training
- Consider article categorization

Best Practices:
- Monitor suggestion acceptance rates weekly
- Adjust threshold based on agent feedback
- Keep knowledge base articles focused and specific
- Regular review of NLU performance metrics""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_012",
        "title": "Agent Copilot FAQ and Common Issues",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-faq/",
        "content": """Frequently asked questions and solutions for Agent Copilot issues.

Q: Why aren't Agent Copilot suggestions appearing?
A: Common causes include:
1. NLU confidence threshold too high - Lower to 0.6 in Admin > AI > Agent Copilot Settings
2. Queue not configured - Enable Agent Copilot in Admin > Contact Center > Queues
3. Knowledge base not connected - Link in Admin > Knowledge > Knowledge Bases
4. Agent permissions missing - Check role has Agent Copilot access

Q: How do I enable Agent Copilot for a specific queue?
A: Navigate to Admin > Contact Center > Queues > Select queue > Enable "Agent Copilot" toggle > Save

Q: Why are suggestions slow to appear?
A: Check these factors:
- Network latency to Genesys Cloud
- Large knowledge base (consider optimizing)
- Browser performance issues
- Multiple concurrent processes

Q: Can I customize which knowledge bases Agent Copilot uses?
A: Yes. Go to Admin > AI > Agent Copilot Settings > Knowledge Sources and select specific knowledge bases.

Q: How do I train Agent Copilot with my own data?
A: Upload conversation transcripts and Q&A pairs via Admin > AI > Training Data. The system learns from accepted and rejected suggestions over time.

Q: What permissions do agents need?
A: Agents need the "Agent Copilot > View" permission in their assigned role.

Q: How do I measure Agent Copilot effectiveness?
A: Use Analytics > Agent Copilot dashboard to view:
- Suggestion acceptance rate
- Time saved per interaction
- Knowledge article usage
- Agent satisfaction scores""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== ROUTING ARTICLES (4) ==========
    {
        "id": "sample_013",
        "title": "Skills-Based Routing Configuration",
        "url": "https://help.mypurecloud.com/articles/skills-based-routing/",
        "content": """Configure skills-based routing to match customers with the most qualified agents.

What is Skills-Based Routing?
Skills-based routing matches incoming interactions to agents based on their assigned skills and proficiency levels. This ensures customers are connected to agents best equipped to handle their specific needs.

Creating Skills:
1. Navigate to Admin > Contact Center > Skills
2. Click "Create Skill"
3. Enter skill name (e.g., "Spanish", "Billing", "Technical Support")
4. Set skill category (optional)
5. Save

Assigning Skills to Agents:
1. Go to Admin > People > Users
2. Select an agent
3. Click "Skills" tab
4. Add skills with proficiency levels (1-5)
5. Save changes

Configuring Skill Requirements:
1. Open Admin > Contact Center > Queues
2. Select target queue
3. Under "Routing" section, click "Skill Requirements"
4. Add required skills
5. Set minimum proficiency level
6. Configure "All Skills" vs "Any Skill" matching

Proficiency Levels:
- Level 1: Basic knowledge
- Level 2: Working knowledge
- Level 3: Proficient
- Level 4: Expert
- Level 5: Master

Best Practices:
- Keep skill definitions clear and specific
- Regularly audit agent skill assignments
- Use proficiency levels meaningfully
- Monitor queue metrics by skill""",
        "category": "Routing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_014",
        "title": "Bullseye Routing Explained",
        "url": "https://help.mypurecloud.com/articles/bullseye-routing/",
        "content": """Bullseye routing progressively expands the search for available agents in concentric rings.

How Bullseye Routing Works:
1. First Ring: Look for agents with all required skills at highest proficiency
2. Second Ring: Expand to agents with slightly lower proficiency
3. Third Ring: Further expand skill requirements
4. Continue until agent found or timeout reached

Configuration Steps:
1. Navigate to Admin > Contact Center > Queues
2. Select queue and go to "Routing" tab
3. Choose "Bullseye" as evaluation method
4. Configure ring settings:
   - Ring 1: Skills required, proficiency minimum
   - Ring 2: Relaxed requirements
   - Ring 3: Further relaxation
   - Timeout between rings

Example Configuration:
Ring 1 (0-30 seconds):
- Required: "Technical Support" skill
- Minimum proficiency: 4

Ring 2 (30-60 seconds):
- Required: "Technical Support" skill
- Minimum proficiency: 2

Ring 3 (60+ seconds):
- Any available agent in queue

Benefits:
- Optimal skill matching when possible
- Graceful degradation under load
- Prevents long wait times
- Balances quality with speed

Monitoring:
- Track which ring most interactions complete in
- Adjust ring timings based on data
- Monitor abandoned call rates""",
        "category": "Routing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_015",
        "title": "Priority Routing Setup",
        "url": "https://help.mypurecloud.com/articles/priority-routing/",
        "content": """Configure priority routing to handle high-value customers or urgent issues first.

Understanding Priority Routing:
Priority routing assigns a priority score to interactions, ensuring higher-priority items are handled first. Priorities range from 0 (lowest) to 100 (highest).

Setting Interaction Priority:
Method 1: In Architect Flow
- Use "Set Priority" action
- Set based on customer data, IVR selections, or external lookups

Method 2: Via Queue Configuration
- Set default priority for queue
- All interactions inherit this priority

Method 3: Via API
- Set priority programmatically when creating interaction

Priority Factors to Consider:
- Customer tier (Platinum > Gold > Silver)
- Issue urgency (outage > question)
- Wait time (increase priority over time)
- Business value (high-value transactions)

Example Priority Scheme:
- VIP Customers: Priority 90
- Premium Customers: Priority 70
- Standard Customers: Priority 50
- Low-priority inquiries: Priority 30

Priority Aging:
Automatically increase priority based on wait time:
- Every 30 seconds: +5 priority
- Maximum priority: 100
Configure in Admin > Contact Center > Queues > Priority Settings

Monitoring:
- Track average priority at answer
- Monitor priority distribution
- Alert on priority aging issues""",
        "category": "Routing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_016",
        "title": "Preferred Agent Routing",
        "url": "https://help.mypurecloud.com/articles/preferred-agent-routing/",
        "content": """Route returning customers to agents they've previously worked with.

What is Preferred Agent Routing?
Preferred Agent Routing attempts to connect customers with agents they've interacted with before, improving continuity and customer satisfaction.

Configuration:
1. Navigate to Admin > Contact Center > Queues
2. Select queue
3. Enable "Preferred Agent Routing"
4. Configure settings:
   - Lookup period (how far back to check)
   - Maximum wait time for preferred agent
   - Fallback behavior

How It Works:
1. Customer initiates contact
2. System checks interaction history
3. If previous agent found and available, route to them
4. If not available, wait or fall back to normal routing

Settings Options:
- Lookup Period: 7, 14, 30, 60, 90 days
- Preferred Agent Timeout: 30-300 seconds
- Fallback: Next best agent or general queue

Use Cases:
- Account management scenarios
- Ongoing case follow-ups
- Relationship-based services
- Complex multi-session issues

Best Practices:
- Set reasonable timeout (60-90 seconds typical)
- Use for high-touch interactions
- Monitor preferred agent match rates
- Don't force long waits for preferred routing

Metrics to Track:
- Preferred agent match rate
- Customer satisfaction for matched vs unmatched
- Average wait time difference""",
        "category": "Routing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== QUALITY MANAGEMENT ARTICLES (5) ==========
    {
        "id": "sample_017",
        "title": "Creating Evaluation Forms",
        "url": "https://help.mypurecloud.com/articles/create-evaluation-forms/",
        "content": """Build evaluation forms to assess agent performance consistently.

Evaluation Form Components:
1. Questions - Individual assessment criteria
2. Groups - Logical groupings of questions
3. Weights - Importance of each section
4. Scoring - Point values and thresholds

Creating a New Form:
1. Navigate to Admin > Quality > Evaluation Forms
2. Click "Create Form"
3. Add form name and description
4. Build question groups
5. Add questions to each group
6. Configure scoring
7. Publish form

Question Types:
- Yes/No: Binary assessment
- Multiple Choice: Select one option
- Range: Score on scale (1-5, 1-10)
- Free Text: Evaluator comments

Weighting Questions:
- Assign percentage weights to groups
- Total must equal 100%
- Critical questions can be marked "Auto-Fail"

Auto-Fail Questions:
Mark questions where failure should automatically fail entire evaluation:
- Compliance violations
- Security breaches
- Prohibited language

Scoring Configuration:
- Set passing threshold (typically 80%)
- Configure score display (percentage or points)
- Enable/disable partial credit

Best Practices:
- Keep forms focused (20-30 questions max)
- Group related questions logically
- Use consistent scoring across forms
- Review and update forms quarterly""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_018",
        "title": "Coaching Sessions and Development",
        "url": "https://help.mypurecloud.com/articles/coaching-sessions/",
        "content": """Create and manage coaching sessions to develop agent skills.

Coaching Overview:
Coaching in Genesys Cloud connects evaluation results with agent development, creating a closed-loop improvement process.

Creating a Coaching Session:
1. Go to Performance > Coaching
2. Click "Create Coaching Appointment"
3. Select agent and supervisor
4. Attach relevant evaluations or recordings
5. Set date, time, and duration
6. Add coaching notes and objectives
7. Save and notify participants

Coaching Types:
- One-on-One: Individual agent coaching
- Group: Team coaching sessions
- Self-Directed: Agent reviews assigned materials

Attaching Materials:
- Link specific evaluations
- Attach interaction recordings
- Include knowledge articles
- Add custom documents

Setting Development Goals:
1. Identify improvement areas from evaluations
2. Set specific, measurable goals
3. Assign timeline for achievement
4. Schedule follow-up sessions
5. Track progress over time

Coaching Workflow:
1. Evaluation identifies improvement opportunity
2. Supervisor creates coaching session
3. Session conducted with agent
4. Goals documented
5. Follow-up scheduled
6. Progress measured in subsequent evaluations

Best Practices:
- Schedule regular coaching (weekly/bi-weekly)
- Focus on 1-2 improvement areas per session
- Use specific examples from recordings
- Document agreed actions
- Follow up on previous goals""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_019",
        "title": "Speech and Text Analytics",
        "url": "https://help.mypurecloud.com/articles/speech-text-analytics/",
        "content": """Leverage AI-powered analytics to gain insights from customer interactions.

Speech and Text Analytics Capabilities:
- Sentiment analysis: Detect customer emotions
- Topic detection: Identify conversation subjects
- Keyword spotting: Find specific terms
- Silence detection: Identify dead air
- Overtalk detection: Find interruptions
- Compliance monitoring: Detect required phrases

Setting Up Analytics:
1. Navigate to Admin > Quality > Analytics Settings
2. Enable Speech Analytics and/or Text Analytics
3. Configure topics and keywords
4. Set up compliance phrases
5. Configure sentiment thresholds

Creating Topics:
1. Go to Admin > Quality > Topics
2. Click "Create Topic"
3. Add topic name (e.g., "Cancellation Request")
4. Add associated phrases and keywords
5. Configure detection settings
6. Activate topic

Compliance Monitoring:
Configure required and prohibited phrases:
- Required: Disclosure statements, greetings
- Prohibited: Profanity, competitor mentions

Sentiment Analysis:
Automatic detection of:
- Positive sentiment: Satisfaction, gratitude
- Negative sentiment: Frustration, anger
- Neutral: Informational exchanges
- Sentiment shifts within conversation

Using Analytics Data:
- Filter evaluations by sentiment
- Search interactions by topic
- Identify training opportunities
- Monitor compliance rates
- Track trending issues

Reports Available:
- Topic trend analysis
- Sentiment distribution
- Compliance scorecard
- Agent performance by topic""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_020",
        "title": "Calibration for Evaluator Consistency",
        "url": "https://help.mypurecloud.com/articles/evaluation-calibration/",
        "content": """Ensure consistent evaluation scoring across all evaluators through calibration.

What is Calibration?
Calibration is the process of comparing evaluator scores on the same interaction to identify and address scoring inconsistencies.

Why Calibration Matters:
- Ensures fair agent treatment
- Identifies evaluator bias
- Maintains evaluation integrity
- Supports defensible performance decisions

Running a Calibration Session:
1. Select an interaction for calibration
2. Assign to multiple evaluators (3-5 recommended)
3. Each evaluator scores independently
4. Compare scores and discuss differences
5. Align on correct interpretation
6. Document calibration decisions

Calibration Metrics:
- Score variance: Difference between evaluators
- Inter-rater reliability: Agreement percentage
- Calibration drift: Changes over time

Addressing Score Variance:
High variance on specific questions indicates:
- Unclear question wording
- Different interpretation of criteria
- Need for additional training

Calibration Frequency:
- New evaluators: Weekly for first month
- Experienced evaluators: Monthly
- After form changes: Immediately
- When variance detected: As needed

Best Practices:
- Use diverse interaction samples
- Include borderline cases
- Document calibration decisions
- Update evaluation guides
- Track calibration scores over time""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_021",
        "title": "Quality Management Best Practices",
        "url": "https://help.mypurecloud.com/articles/qm-best-practices/",
        "content": """Implement a world-class quality management program with these best practices.

Program Foundation:
1. Define quality standards and criteria
2. Create consistent evaluation forms
3. Train evaluators thoroughly
4. Calibrate regularly
5. Connect evaluations to coaching
6. Track improvement over time

Evaluation Volume Guidelines:
- Minimum: 4 evaluations per agent per month
- Recommended: 8-12 evaluations per agent per month
- New agents: 2-3x normal volume initially

Sample Selection:
- Random sampling for general quality
- Targeted sampling for specific issues
- Customer-flagged interactions
- High-value transaction reviews
- Compliance-focused sampling

Feedback Delivery:
- Timely: Within 48-72 hours of interaction
- Specific: Reference exact moments
- Balanced: Recognize strengths and improvements
- Actionable: Provide clear next steps
- Documented: Record in system

Metrics to Track:
- Average evaluation score
- Score trends over time
- Evaluator consistency
- Coaching completion rates
- Score-to-satisfaction correlation

Continuous Improvement:
- Review evaluation forms quarterly
- Update criteria based on business changes
- Gather agent feedback on process
- Benchmark against industry standards
- Share best practice recordings""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== TROUBLESHOOTING GUIDES (5) ==========
    {
        "id": "sample_022",
        "title": "Troubleshoot Web Messaging Issues",
        "url": "https://help.mypurecloud.com/articles/troubleshoot-web-messaging/",
        "content": """Common Web Messaging issues and solutions.

Issue: Messenger widget not appearing on website
Solutions:
1. Verify deployment is active in Admin > Messenger
2. Check JavaScript snippet is correctly installed
3. Confirm no ad-blockers are interfering
4. Verify domain is whitelisted in deployment settings
5. Check browser console for errors

Issue: Messages not being delivered
Solutions:
1. Check queue assignment in message flow
2. Verify agents are available and logged in
3. Confirm ACD settings are correct
4. Review message flow in Architect
5. Check integration status

Issue: Bot not responding
Solutions:
1. Verify bot flow is published
2. Check intent recognition settings
3. Confirm bot is assigned to deployment
4. Review bot flow logic in Architect
5. Check NLU training data

Issue: File attachments failing
Solutions:
1. Check file size limits (10MB max)
2. Verify file type is allowed
3. Confirm attachment setting is enabled
4. Check storage quota
5. Review security settings

Issue: Chat history not persisting
Solutions:
1. Enable conversation history in deployment
2. Check customer authentication
3. Verify cookie settings
4. Confirm storage configuration

Diagnostic Steps:
1. Check Admin > Messenger > Deployments status
2. Review browser developer tools console
3. Test in incognito/private window
4. Check network requests for errors
5. Review Architect flow execution logs""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_023",
        "title": "Troubleshoot Call Quality Issues",
        "url": "https://help.mypurecloud.com/articles/troubleshoot-call-quality/",
        "content": """Diagnose and resolve voice call quality problems.

Common Call Quality Issues:
- Choppy or distorted audio
- One-way audio
- Echo
- Call drops
- Delayed audio

Troubleshooting Steps:

1. Check Network Quality:
- Run network readiness test
- Verify bandwidth (100kbps per call minimum)
- Check for jitter (under 30ms target)
- Monitor packet loss (under 1% target)
- Validate latency (under 150ms recommended)

2. WebRTC Phone Issues:
- Update browser to latest version
- Clear browser cache
- Disable browser extensions
- Check microphone/speaker permissions
- Test with different headset

3. Edge/Trunk Issues:
- Verify SIP trunk status
- Check codec configuration
- Review firewall settings
- Confirm NAT settings
- Test with packet capture

4. Audio Quality Metrics:
Access via Performance > Interactions > Voice tab:
- MOS score (target > 3.5)
- Jitter measurements
- Packet loss percentage
- Latency readings

5. Common Fixes:
- Switch from WiFi to wired connection
- Close bandwidth-heavy applications
- Upgrade network equipment
- Adjust QoS settings
- Update audio drivers

Escalation Path:
1. Gather call ID and timestamps
2. Export quality metrics
3. Collect network diagnostics
4. Contact Genesys support with data""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_024",
        "title": "Troubleshoot Integration Errors",
        "url": "https://help.mypurecloud.com/articles/troubleshoot-integrations/",
        "content": """Resolve common integration and data action issues.

Data Action Troubleshooting:

Issue: Data action failing with timeout
Solutions:
1. Increase timeout setting (Admin > Integrations)
2. Optimize external API response time
3. Check network connectivity
4. Review authentication credentials
5. Verify endpoint availability

Issue: Authentication errors
Solutions:
1. Verify OAuth credentials
2. Check token expiration settings
3. Confirm scopes are correct
4. Review API key validity
5. Test authentication separately

Issue: Invalid response format
Solutions:
1. Check response parsing configuration
2. Verify JSON/XML schema matches
3. Review data transformation rules
4. Add error handling for edge cases
5. Test with sample responses

Integration Health Check:
1. Navigate to Admin > Integrations
2. Check status indicator (green = healthy)
3. Review error logs
4. Test connection
5. Verify configuration

Common Integration Types:
- Salesforce: Check connected app settings
- AWS: Verify IAM permissions
- Custom REST: Check URL and headers
- Database: Verify connection string
- CRM: Check field mappings

Debugging Steps:
1. Enable debug logging
2. Review execution history
3. Check input/output mappings
4. Validate data transformations
5. Test in isolation

Best Practices:
- Implement retry logic
- Add meaningful error messages
- Monitor integration health
- Set up alerting
- Document configurations""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_025",
        "title": "Troubleshoot Reporting and Analytics",
        "url": "https://help.mypurecloud.com/articles/troubleshoot-analytics/",
        "content": """Resolve issues with reports and analytics data.

Issue: Report shows no data
Solutions:
1. Verify date range includes data
2. Check filter settings
3. Confirm user has proper permissions
4. Verify division access
5. Check data availability (processing delay)

Issue: Metrics seem incorrect
Common Causes:
1. Different time zones applied
2. Filter excluding expected data
3. Metric definition misunderstanding
4. Data still processing
5. Calculation differences (real-time vs historical)

Issue: Export failing or incomplete
Solutions:
1. Reduce date range
2. Simplify report criteria
3. Check file size limits
4. Try different export format
5. Schedule during off-peak hours

Issue: Dashboard not loading
Solutions:
1. Clear browser cache
2. Check internet connectivity
3. Verify permissions
4. Try different browser
5. Contact support if persists

Data Processing Timeline:
- Real-time data: Immediate
- Historical metrics: 15-30 minute delay
- Complex analytics: Up to 24 hours
- Aggregated reports: End of day

Permission Requirements:
- Analytics > View: Basic viewing
- Analytics > Export: Download data
- Analytics > Admin: All access
- Division-specific: Limited to assigned divisions

Validation Steps:
1. Compare with real-time dashboard
2. Check data in different views
3. Verify calculation logic
4. Cross-reference with source systems""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_026",
        "title": "Troubleshoot Agent Desktop Issues",
        "url": "https://help.mypurecloud.com/articles/troubleshoot-agent-desktop/",
        "content": """Fix common agent desktop and softphone problems.

Issue: Cannot log into agent desktop
Solutions:
1. Clear browser cache and cookies
2. Check network connectivity
3. Verify credentials
4. Confirm station/phone assignment
5. Check browser compatibility

Issue: Softphone not connecting
Solutions:
1. Allow microphone permissions
2. Check WebRTC compatibility
3. Disable VPN if applicable
4. Verify firewall settings
5. Try different browser

Issue: Status not changing correctly
Solutions:
1. Check queue membership
2. Verify presence settings
3. Review auto-answer configuration
4. Check wrap-up settings
5. Confirm routing status

Issue: Screen recording not working
Solutions:
1. Check browser permissions
2. Verify recording policy
3. Confirm agent consent settings
4. Check storage availability
5. Review browser compatibility

Issue: Interactions not alerting
Solutions:
1. Check sound settings
2. Verify notification permissions
3. Review alerting settings
4. Check queue assignment
5. Confirm agent availability

Best Practices:
- Use supported browsers (Chrome recommended)
- Clear cache weekly
- Keep browser updated
- Use wired headset
- Close unnecessary tabs

System Requirements:
- Chrome 80+ or Edge 80+
- 4GB RAM minimum
- Stable internet (5Mbps+)
- Supported operating system""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== DIGITAL BOTS AND ARCHITECT (4) ==========
    {
        "id": "sample_027",
        "title": "About Digital Bot Flows",
        "url": "https://help.mypurecloud.com/articles/about-digital-bot-flows/",
        "content": """Build automated conversation flows for digital channels.

Digital Bot Flow Overview:
Digital bot flows handle automated interactions on web messaging, SMS, and social channels without human intervention.

Key Components:
1. Intents: Customer intentions to recognize
2. Slots: Information to extract
3. Bot Actions: Automated responses
4. Handoff: Transfer to human agents

Creating a Bot Flow:
1. Navigate to Admin > Architect
2. Select "Bot Flow" type
3. Name your flow
4. Build conversation logic
5. Train NLU model
6. Publish and assign

Intent Configuration:
- Create intents for common requests
- Add utterance examples (10-20 per intent)
- Define required slots
- Configure fulfillment actions

NLU Training:
- Add diverse utterance examples
- Include variations and misspellings
- Test recognition accuracy
- Iterate based on results

Handoff to Agent:
Configure when bot should transfer:
- Low confidence scores
- Customer request
- Complex issues
- Negative sentiment
- Multiple failures

Best Practices:
- Start with high-volume use cases
- Keep conversations focused
- Provide clear options
- Always offer human fallback
- Monitor and improve continuously

Analytics:
- Containment rate
- Intent recognition accuracy
- Handoff rate
- Customer satisfaction
- Average conversation length""",
        "category": "Digital Bots",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_028",
        "title": "Architect Flow Design Guide",
        "url": "https://help.mypurecloud.com/articles/architect-flow-design/",
        "content": """Design effective IVR and routing flows in Architect.

Architect Overview:
Architect is the visual flow builder for creating IVR menus, routing logic, and automated processes.

Flow Types:
- Inbound Call: Voice IVR menus
- In-Queue Call: Hold treatment
- Outbound Call: Dialer flows
- Callback: Scheduled callbacks
- Message: Digital messaging
- Email: Email routing
- Bot: Automated conversations
- Workflow: Background processes

Design Best Practices:
1. Plan flow before building
2. Keep paths simple and short
3. Use consistent menu structures
4. Provide escape options
5. Handle errors gracefully

Common Actions:
- Play Audio: Prompts and messages
- Get Input: DTMF or speech
- Data Actions: External integrations
- Transfer: Route to queue/user
- Disconnect: End interaction
- Set Variables: Store data

Menu Design:
- Limit options to 4-5 per menu
- Most common options first
- Always include "0 for agent"
- Confirm selections
- Provide timeout handling

Testing:
1. Use Architect debug mode
2. Test all paths
3. Validate data actions
4. Check error handling
5. Test with real scenarios

Version Control:
- Save frequently
- Use meaningful version names
- Test before publishing
- Keep rollback option
- Document changes""",
        "category": "AI Features",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_029",
        "title": "IVR Best Practices",
        "url": "https://help.mypurecloud.com/articles/ivr-best-practices/",
        "content": """Optimize your IVR for better customer experience.

IVR Design Principles:
1. Respect caller time
2. Speak customer language
3. Minimize menu depth
4. Provide shortcuts
5. Enable easy agent access

Menu Structure:
- Maximum 3 menu levels deep
- 4-5 options per menu
- Clear, concise prompts
- Natural language options
- Repeat option always available

Prompt Writing:
Do:
- Use active voice
- Keep prompts under 15 seconds
- Confirm important information
- Provide context

Don't:
- Use jargon
- Over-apologize
- Include unnecessary information
- Force listening to full prompt

Speech Recognition:
- Support natural phrases
- Allow interruption (barge-in)
- Handle common variations
- Include confirmation
- Provide DTMF fallback

Personalization:
- Greet by name when known
- Reference account status
- Tailor options to history
- Skip irrelevant menus
- Remember preferences

Self-Service Integration:
- Account balance lookups
- Order status checks
- Payment processing
- Appointment scheduling
- FAQs and information

Metrics to Track:
- IVR containment rate
- Menu opt-out rates
- Average time in IVR
- Speech recognition accuracy
- Customer satisfaction

Continuous Improvement:
- Analyze drop-off points
- Review transcriptions
- Test regularly
- Update based on feedback
- A/B test new options""",
        "category": "AI Features",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_030",
        "title": "Callback Configuration",
        "url": "https://help.mypurecloud.com/articles/configure-callback/",
        "content": """Set up customer callback functionality.

Callback Types:
1. In-Queue Callback: Customer requests callback instead of waiting
2. Scheduled Callback: Customer selects future time
3. Web Callback: Initiated from website

In-Queue Callback Setup:
1. Navigate to Admin > Contact Center > Queues
2. Select queue
3. Enable "Offer Callback" option
4. Configure settings:
   - Minimum wait time before offer
   - Callback message prompt
   - Confirmation prompt

Architect Configuration:
1. Create callback flow
2. Add callback offer decision
3. Configure callback request action
4. Handle acceptance/rejection
5. Set callback queue

Web Callback:
1. Create widget in Admin > Widgets
2. Configure callback form
3. Add JavaScript to website
4. Connect to Architect flow
5. Route to appropriate queue

Callback Dialing:
- Outbound campaigns dial callbacks
- Or configure automatic callback calling
- Set retry rules
- Define business hours
- Handle voicemail/busy

Settings Options:
- Maximum callback wait time
- Number of retry attempts
- Retry interval
- Operating hours
- Overflow handling

Reporting:
- Callbacks requested
- Callbacks completed
- Average time to callback
- Callback abandonment
- Customer satisfaction

Best Practices:
- Offer callback at appropriate wait time
- Provide estimated callback time
- Allow cancellation
- Respect time zone
- Confirm callback was completed""",
        "category": "AI Features",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== ANALYTICS AND REPORTING (3) ==========
    {
        "id": "sample_031",
        "title": "Performance Dashboards Guide",
        "url": "https://help.mypurecloud.com/articles/performance-dashboards/",
        "content": """Build and customize real-time performance dashboards.

Dashboard Types:
1. Queue Performance: Real-time queue metrics
2. Agent Performance: Individual/team metrics
3. Interaction Details: Transaction-level data
4. WFM: Workforce metrics
5. Custom: User-built dashboards

Creating Custom Dashboard:
1. Navigate to Performance > Dashboards
2. Click "Create Dashboard"
3. Name dashboard
4. Add widgets
5. Configure layout
6. Save and share

Widget Types:
- Metric widgets: Single KPI display
- Chart widgets: Trends over time
- Table widgets: Tabular data
- Alert widgets: Threshold notifications

Common Metrics:
Queue Metrics:
- Interactions waiting
- Average wait time
- Service level
- Abandon rate
- Agents available

Agent Metrics:
- Handle time
- After call work
- Utilization
- Status time
- Quality scores

Refresh Rates:
- Real-time: Every 3-5 seconds
- Near real-time: Every 30 seconds
- Periodic: User-defined interval

Sharing Dashboards:
- Share with specific users
- Share with roles
- Make division-specific
- Export to PDF/image

Best Practices:
- Include most critical metrics
- Use color coding meaningfully
- Set appropriate thresholds
- Organize logically
- Don't overcrowd

Wallboard Mode:
- Full-screen display
- Auto-rotate dashboards
- Suitable for contact center displays
- Customizable refresh rate""",
        "category": "Analytics",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_032",
        "title": "Historical Reporting Guide",
        "url": "https://help.mypurecloud.com/articles/historical-reports/",
        "content": """Generate and schedule historical reports.

Report Categories:
1. Interaction Reports: Call/chat/email details
2. Queue Reports: Performance by queue
3. Agent Reports: Individual metrics
4. Flow Reports: IVR/Architect analytics
5. Quality Reports: Evaluation data
6. WFM Reports: Workforce metrics

Creating Reports:
1. Navigate to Analytics > Reports
2. Select report type
3. Configure date range
4. Apply filters
5. Select columns
6. Run or schedule

Common Report Types:
- Agent Activity Summary
- Queue Performance Summary
- Interaction Detail
- Wrap-up Code Summary
- Transfer Report

Scheduling Reports:
1. Configure report parameters
2. Click "Schedule"
3. Set frequency (daily/weekly/monthly)
4. Choose delivery time
5. Add email recipients
6. Select export format

Export Formats:
- CSV: Data analysis
- PDF: Presentation
- Excel: Manipulation
- API: Integration

Custom Reports:
- Build with report builder
- Combine multiple data sources
- Create calculated fields
- Save templates
- Share across organization

Data Retention:
- Real-time: 30 days
- Historical: Based on subscription
- Exports: As long as stored
- Recordings: Per retention policy

Best Practices:
- Schedule during off-peak
- Use filters to limit data
- Archive important reports
- Document report definitions
- Review regularly for accuracy""",
        "category": "Analytics",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_033",
        "title": "Contact Center KPIs Guide",
        "url": "https://help.mypurecloud.com/articles/contact-center-kpis/",
        "content": """Key performance indicators for contact center success.

Service Level Metrics:
- Service Level (SL): % answered within threshold
- Average Speed of Answer (ASA): Mean wait time
- Abandon Rate: % of callers who hang up
- First Contact Resolution (FCR): % resolved first contact

Efficiency Metrics:
- Average Handle Time (AHT): Talk + Hold + ACW
- Occupancy: % time handling contacts
- Utilization: % time available/handling
- Contacts per Hour: Productivity measure

Quality Metrics:
- Quality Score: Evaluation results
- Customer Satisfaction (CSAT): Survey scores
- Net Promoter Score (NPS): Loyalty indicator
- Customer Effort Score (CES): Ease of resolution

Agent Metrics:
- Schedule Adherence: Following schedule
- Attendance: Showing up as scheduled
- Attrition Rate: Turnover
- Training Compliance: Certifications current

Industry Benchmarks:
- Service Level: 80% in 20 seconds
- Abandon Rate: Under 5%
- FCR: 70-75%
- CSAT: 85%+
- AHT: Varies by type

Setting Targets:
1. Understand current baseline
2. Benchmark against industry
3. Set realistic improvement goals
4. Communicate to team
5. Track progress regularly

Metric Relationships:
- Lower AHT may reduce quality
- Higher SL may increase costs
- FCR improvement reduces volume
- Balance is critical

Reporting Cadence:
- Real-time: SL, wait times, availability
- Daily: AHT, handle volume, abandon
- Weekly: Quality, adherence, trends
- Monthly: CSAT, NPS, FCR""",
        "category": "Analytics",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== INTEGRATIONS AND API (3) ==========
    {
        "id": "sample_034",
        "title": "Data Actions Configuration",
        "url": "https://help.mypurecloud.com/articles/configure-data-actions/",
        "content": """Create data actions to integrate with external systems.

Data Action Overview:
Data actions enable Genesys Cloud to communicate with external APIs, databases, and services during interactions.

Creating a Data Action:
1. Navigate to Admin > Integrations
2. Select or create integration
3. Click "Add Data Action"
4. Configure request settings
5. Define input/output contracts
6. Test and publish

Configuration Components:
Request:
- HTTP Method (GET, POST, PUT, DELETE)
- URL endpoint
- Headers
- Authentication
- Request body template

Input Contract:
- Define expected inputs
- Set data types
- Mark required fields
- Add validation rules

Output Contract:
- Define response mapping
- Parse JSON/XML response
- Extract needed fields
- Handle arrays/objects

Using in Architect:
1. Add "Call Data Action" action
2. Select published data action
3. Map input variables
4. Handle success/failure paths
5. Use output in flow

Error Handling:
- Configure timeout (default 30s)
- Handle HTTP errors
- Parse error responses
- Define fallback behavior
- Log for debugging

Authentication Types:
- None: Open endpoints
- Basic: Username/password
- OAuth 2.0: Token-based
- API Key: Header or query
- Custom: Advanced scenarios

Best Practices:
- Use meaningful names
- Document thoroughly
- Test extensively
- Monitor performance
- Implement retry logic""",
        "category": "Integrations",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_035",
        "title": "Salesforce Integration Guide",
        "url": "https://help.mypurecloud.com/articles/salesforce-integration/",
        "content": """Integrate Genesys Cloud with Salesforce CRM.

Integration Overview:
The Genesys Cloud for Salesforce integration enables click-to-dial, screen pops, and activity logging within Salesforce.

Setup Requirements:
- Salesforce admin access
- Genesys Cloud admin access
- Connected app in Salesforce
- Integration user credentials

Installation Steps:
1. Install managed package from AppExchange
2. Configure connected app
3. Create integration in Genesys Cloud
4. Configure OAuth settings
5. Map user accounts
6. Enable features

Features:
- Click-to-dial from Salesforce
- Screen pop on incoming
- Automatic activity logging
- Call controls in Salesforce
- Transfer with context

Screen Pop Configuration:
1. Navigate to integration settings
2. Configure matching rules:
   - Phone number
   - Email address
   - Account ID
3. Set pop behavior (new tab, same tab)
4. Configure no-match handling

Activity Logging:
- Automatic task creation
- Call duration capture
- Wrap-up code mapping
- Custom field population
- Recording links

Data Actions:
- Query Salesforce records
- Create/update records
- Look up customer data
- Log custom information

Troubleshooting:
- Verify OAuth tokens
- Check user mapping
- Review matching rules
- Confirm permissions
- Test in sandbox first""",
        "category": "Integrations",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_036",
        "title": "API Authentication Guide",
        "url": "https://help.mypurecloud.com/articles/api-authentication/",
        "content": """Authenticate to Genesys Cloud Platform APIs.

Authentication Methods:

1. OAuth 2.0 Client Credentials:
Best for: Server-to-server integration
Setup:
- Create OAuth client in Admin > Integrations
- Use client ID and secret
- Request access token
- Use token in API calls

2. OAuth 2.0 Authorization Code:
Best for: User-context applications
Flow:
- Redirect user to auth URL
- User grants permission
- Receive authorization code
- Exchange for access token

3. OAuth 2.0 Implicit:
Best for: Single-page applications
Note: Less secure, use with caution

Creating OAuth Client:
1. Navigate to Admin > Integrations > OAuth
2. Click "Add Client"
3. Enter name and description
4. Select grant type
5. Configure redirect URIs (if applicable)
6. Assign roles/permissions
7. Save and note credentials

Token Management:
- Access tokens expire (typically 24 hours)
- Implement token refresh
- Store tokens securely
- Don't expose in client code

API Regions:
- Americas: api.mypurecloud.com
- EMEA: api.mypurecloud.ie
- Asia Pacific: api.mypurecloud.com.au
- etc.

Rate Limiting:
- 300 requests per minute default
- 429 response when exceeded
- Implement exponential backoff
- Cache responses when possible

Security Best Practices:
- Rotate credentials regularly
- Use minimum required permissions
- Audit API access
- Monitor for anomalies
- Secure storage of secrets""",
        "category": "Integrations",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== SECURITY AND COMPLIANCE (3) ==========
    {
        "id": "sample_037",
        "title": "Security Best Practices",
        "url": "https://help.mypurecloud.com/articles/security-best-practices/",
        "content": """Implement security best practices for Genesys Cloud.

User Access Management:
- Enable single sign-on (SSO)
- Implement multi-factor authentication (MFA)
- Use principle of least privilege
- Review access regularly
- Disable inactive accounts

Role Configuration:
- Use built-in roles when possible
- Create custom roles minimally
- Audit role assignments
- Document permission rationale
- Review quarterly

Data Protection:
- Enable encryption at rest
- Use TLS for data in transit
- Mask sensitive data in logs
- Configure data retention
- Implement DLP policies

Recording Security:
- Enable recording encryption
- Control access by role
- Set retention policies
- Audit recording access
- Secure deletion

Network Security:
- Whitelist Genesys IPs
- Configure firewall rules
- Use VPN for remote
- Monitor network traffic
- Segment networks

Integration Security:
- Use OAuth for APIs
- Rotate credentials
- Audit integration access
- Monitor API usage
- Secure webhooks

Compliance Considerations:
- PCI DSS for payments
- HIPAA for healthcare
- GDPR for EU data
- SOC 2 compliance
- Industry-specific requirements

Incident Response:
- Define escalation procedures
- Document security contacts
- Test response plans
- Review after incidents
- Maintain audit trails""",
        "category": "Security",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_038",
        "title": "GDPR Compliance Guide",
        "url": "https://help.mypurecloud.com/articles/gdpr-compliance/",
        "content": """Ensure GDPR compliance in Genesys Cloud.

GDPR Overview:
The General Data Protection Regulation governs how personal data of EU residents must be handled.

Data Subject Rights:
1. Right to Access: Provide data upon request
2. Right to Rectification: Correct inaccurate data
3. Right to Erasure: Delete data when requested
4. Right to Portability: Export data in usable format
5. Right to Object: Stop processing

Genesys Cloud GDPR Tools:
- GDPR API for data requests
- Bulk data export capability
- Automated data retention
- Consent management
- Audit logging

Handling Access Requests:
1. Verify requestor identity
2. Search for personal data
3. Compile data export
4. Provide within 30 days
5. Document the request

Data Erasure Process:
1. Verify deletion request
2. Identify all data locations
3. Execute deletion
4. Confirm completion
5. Document for compliance

Recording Considerations:
- Consent before recording
- Announce recording
- Allow opt-out
- Retention limits
- Secure deletion

Consent Management:
- Document consent obtained
- Track consent changes
- Enable consent withdrawal
- Update preferences promptly

Data Processing Agreements:
- Review with Genesys
- Document subprocessors
- Maintain records
- Update as needed

Best Practices:
- Minimize data collection
- Implement retention policies
- Train staff regularly
- Document procedures
- Regular compliance audits""",
        "category": "Security",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_039",
        "title": "PCI DSS Compliance",
        "url": "https://help.mypurecloud.com/articles/pci-compliance/",
        "content": """Maintain PCI DSS compliance for payment processing.

PCI DSS Overview:
Payment Card Industry Data Security Standard requirements for handling credit card data.

Genesys Cloud PCI Features:
- Secure pause for recordings
- DTMF masking
- Secure IVR payments
- Encrypted storage
- Access controls

Secure Pause:
During card data entry:
1. Agent initiates secure pause
2. Recording stops
3. Customer enters card data
4. Agent confirms (without seeing data)
5. Recording resumes

DTMF Masking:
- Mask card numbers in transcripts
- Hide CVV completely
- Mask in recordings
- Protect in logs

IVR Payment Processing:
Best Practices:
- Use certified payment gateway
- Never store full card numbers
- Tokenize payment data
- Encrypt in transit
- Audit access

Agent Training:
- Never write down card data
- Clear screens after calls
- Report suspicious activity
- Follow clean desk policy
- Annual PCI training

Network Segmentation:
- Isolate payment systems
- Restrict access
- Monitor traffic
- Regular testing

Compliance Validation:
- Self-assessment questionnaire
- External audits (if required)
- Penetration testing
- Vulnerability scanning
- Documentation

Recording Guidelines:
- Enable secure pause
- Verify pause activation
- Test regularly
- Audit recordings
- Delete per retention policy""",
        "category": "Security",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== WORKFORCE MANAGEMENT ARTICLES (4) ==========
    {
        "id": "sample_040",
        "title": "Workforce Forecasting Fundamentals",
        "url": "https://help.mypurecloud.com/articles/wfm-forecasting/",
        "content": """Create accurate forecasts to optimize staffing levels.

Forecasting Overview:
Workforce forecasting predicts future interaction volumes and required staffing based on historical patterns and known events.

Data Requirements:
- Minimum 4 weeks of historical data
- Recommended: 12+ months for seasonal patterns
- Include all interaction channels

Creating a Forecast:
1. Navigate to Workforce Management > Forecasting
2. Select date range
3. Choose forecasting method
4. Review and adjust as needed
5. Publish forecast

Forecasting Methods:
- Historical Average: Simple, uses past averages
- Weighted Average: Emphasizes recent data
- Best Fit: Algorithm selects optimal method
- Manual: User-defined values

Adjusting for Events:
- Add known events (holidays, promotions)
- Apply percentage adjustments
- Account for one-time occurrences
- Factor in business changes

Forecast Accuracy Metrics:
- MAPE (Mean Absolute Percentage Error)
- Target: Under 5% for mature operations
- Review accuracy weekly

Improving Forecast Accuracy:
- Clean historical data
- Document unusual events
- Track marketing campaigns
- Note external factors
- Compare forecast vs actual regularly

Channel Considerations:
- Voice: Higher staffing ratio needed
- Chat: Agents can handle multiple
- Email: Longer handling, flexible timing""",
        "category": "Workforce Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_041",
        "title": "Agent Scheduling Guide",
        "url": "https://help.mypurecloud.com/articles/wfm-scheduling/",
        "content": """Generate optimized agent schedules that meet service level goals.

Scheduling Process:
1. Forecast provides required staffing
2. System generates optimal schedules
3. Planner reviews and adjusts
4. Schedules published to agents
5. Agents can view in their desktop

Creating Schedules:
1. Go to Workforce Management > Scheduling
2. Select date range
3. Choose scheduling run type
4. Configure constraints
5. Generate schedule
6. Review and publish

Schedule Constraints:
- Minimum/maximum shift length
- Required breaks and lunches
- Start time preferences
- Skill requirements
- Contracted hours

Shift Types:
- Fixed: Same times daily
- Rotating: Varies by week
- Flexible: Within defined windows
- Split: Multiple segments

Agent Preferences:
- Shift bidding: Agents rank preferences
- Time-off requests: Approved/denied
- Availability: Agent-defined constraints

Schedule Optimization:
System balances:
- Service level requirements
- Labor cost minimization
- Agent preferences
- Skill coverage
- Regulatory compliance

Publishing Schedules:
- Lead time: 2-4 weeks recommended
- Notification: Automatic to agents
- Changes: Track and communicate
- Swaps: Agent-initiated trades""",
        "category": "Workforce Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_042",
        "title": "Real-Time Adherence Monitoring",
        "url": "https://help.mypurecloud.com/articles/wfm-adherence/",
        "content": """Monitor and manage agent schedule adherence in real-time.

What is Adherence?
Adherence measures whether agents are doing what they're scheduled to do, when they're scheduled to do it.

Adherence vs Conformance:
- Adherence: Correct activity at correct time
- Conformance: Total time in scheduled activities (regardless of timing)

Viewing Real-Time Adherence:
1. Go to Workforce Management > Adherence
2. View agent status dashboard
3. See scheduled vs actual activity
4. Identify out-of-adherence agents

Adherence Statuses:
- In Adherence: Agent activity matches schedule
- Out of Adherence: Mismatch between scheduled and actual
- Unscheduled: Agent working without schedule

Common Out-of-Adherence Causes:
- Extended breaks
- Late returns from lunch
- Unplanned off-phone time
- System issues
- Meetings running long

Exception Management:
1. Identify adherence exception
2. Document reason
3. Approve/deny exception
4. Adjust schedule if recurring

Adherence Alerts:
Configure alerts for:
- Individual agent thresholds
- Team-level thresholds
- Specific activity types
- Duration thresholds

Reporting:
- Daily adherence summary
- Trend analysis
- Exception report
- Agent comparison
- Cost impact analysis""",
        "category": "Workforce Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_043",
        "title": "Intraday Management",
        "url": "https://help.mypurecloud.com/articles/wfm-intraday/",
        "content": """Manage staffing in real-time to meet changing conditions.

Intraday Management Overview:
Intraday management compares actual conditions to forecast and schedule, enabling real-time adjustments to maintain service levels.

Intraday Dashboard:
- Forecast vs Actual volume
- Scheduled vs Available agents
- Service level tracking
- Queue performance

When to Adjust:
- Volume higher than forecast: Add staff
- Volume lower than forecast: Release staff
- Unexpected absences: Backfill
- Service level dropping: Take action

Adjustment Options:
1. Overtime (OT): Extend scheduled agents
2. Voluntary Time Off (VTO): Release excess staff
3. Skill changes: Reassign agents
4. Break adjustments: Stagger timing
5. Off-phone time: Postpone or advance

Reforecast Process:
1. Observe actual trend
2. Calculate variance from forecast
3. Project remainder of day
4. Adjust staffing accordingly

Communication:
- Broadcast messages to agents
- Real-time schedule updates
- Supervisor notifications
- Automated VTO offers

Best Practices:
- Check intraday status every 30-60 minutes
- Have standby agents for peak periods
- Pre-approve OT limits
- Document adjustment reasons
- Review intraday decisions weekly

Metrics to Monitor:
- Forecast accuracy (intraday)
- Adjustment frequency
- Service level recovery time
- OT/VTO utilization""",
        "category": "Workforce Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # ========== ADDITIONAL AGENT COPILOT TROUBLESHOOTING (8 articles) ==========
    {
        "id": "sample_044",
        "title": "Agent Copilot Suggestions Not Appearing - Complete Troubleshooting Guide",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-suggestions-not-appearing/",
        "content": """Complete troubleshooting guide when Agent Copilot suggestions are not appearing for agents.

STEP 1: Verify Queue Configuration
First, check if Agent Copilot is enabled for the specific queue:
1. Navigate to Admin > Contact Center > Queues
2. Select the queue experiencing issues
3. Scroll to the "Features" or "AI Settings" section
4. Verify "Enable Agent Copilot" toggle is ON
5. Save changes if any modifications were made

If the toggle was already enabled, proceed to Step 2.

STEP 2: Check NLU Confidence Threshold
A common cause is the NLU confidence threshold being set too high:
1. Navigate to Admin > AI > Agent Copilot Settings
2. Find "NLU Confidence Threshold" setting
3. If set above 0.7, try lowering to 0.5 or 0.6
4. Save and test with a new conversation

Recommended threshold values:
- 0.5-0.6: More suggestions, some may be less relevant
- 0.7: Balanced (recommended starting point)
- 0.8-0.9: Fewer but more accurate suggestions

STEP 3: Verify Knowledge Base Connection
Suggestions require a properly connected knowledge base:
1. Go to Admin > Knowledge > Knowledge Bases
2. Ensure at least one knowledge base is enabled for Agent Copilot
3. Check that the knowledge base contains published articles
4. Verify article status is "Published" not "Draft"

STEP 4: Check Agent Permissions
1. Navigate to Admin > People > Roles
2. Find the agent's assigned role
3. Verify the role includes "Agent Copilot > View" permission
4. If missing, add the permission and save

STEP 5: Verify Conversation Type
Agent Copilot may only be configured for certain channels:
- Check if Agent Copilot is enabled for voice/chat/messaging
- Some organizations limit to specific interaction types
- Review channel-specific settings in queue configuration

STEP 6: Test with a Fresh Conversation
1. Start a completely new test interaction
2. Use clear, recognizable queries matching knowledge base content
3. Allow 3-5 seconds for suggestions to load
4. Check browser console for any JavaScript errors

Still Not Working?
- Clear browser cache and cookies
- Try a different browser
- Check network connectivity to Genesys Cloud
- Contact Genesys support with queue name and timestamps""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_045",
        "title": "Agent Copilot Queue Settings - Step-by-Step Configuration",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-queue-configuration/",
        "content": """Detailed guide for configuring Agent Copilot settings at the queue level.

Understanding Queue-Level Agent Copilot Settings:
Each queue in Genesys Cloud can have its own Agent Copilot configuration. This allows different teams to have customized AI assistance based on their specific needs.

Accessing Queue Settings:
1. Log into Genesys Cloud as an administrator
2. Navigate to Admin > Contact Center > Queues
3. Click on the queue you want to configure
4. Select the "AI & Automation" or "Features" tab

Enabling Agent Copilot for a Queue:
1. Find the "Agent Copilot" section
2. Toggle "Enable Agent Copilot" to ON
3. Select which knowledge bases to use
4. Configure suggestion display options
5. Click "Save"

Configuration Options:

Knowledge Base Selection:
- Choose one or more knowledge bases
- Primary knowledge base gets priority
- Secondary bases provide fallback content

Suggestion Display:
- Maximum suggestions to show (1-5 recommended: 3)
- Auto-populate agent response field (on/off)
- Show relevance scores (on/off)

Advanced Settings:
- Confidence threshold override (use global or queue-specific)
- Interaction types to enable (voice, chat, email)
- Working hours for AI assistance

Troubleshooting Queue Settings:
If changes don't take effect:
1. Wait 2-3 minutes for propagation
2. Have agents log out and back in
3. Clear browser cache
4. Verify no conflicting organization-level settings

Best Practices:
- Test changes with pilot group first
- Document queue configurations
- Review settings during quarterly audits
- Train agents on expected behavior""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_046",
        "title": "Knowledge Base Setup for Agent Copilot",
        "url": "https://help.mypurecloud.com/articles/knowledge-base-agent-copilot-setup/",
        "content": """Configure your knowledge base to work optimally with Agent Copilot.

Prerequisites:
- Admin access to Genesys Cloud
- At least one knowledge base created
- Published articles in the knowledge base

Connecting Knowledge Base to Agent Copilot:

Step 1: Access Knowledge Base Settings
1. Navigate to Admin > Knowledge > Knowledge Bases
2. Select the knowledge base to enable
3. Click "Edit" or access Settings

Step 2: Enable for Agent Copilot
1. Find "Integration Settings" or "AI Settings"
2. Toggle "Use for Agent Copilot" to ON
3. Configure which article categories to include
4. Save changes

Step 3: Verify Article Status
For articles to appear in Agent Copilot:
- Articles must be in "Published" status
- Draft articles will NOT appear
- Recently published articles may take 15-30 minutes to index

Optimizing Knowledge Base for Agent Copilot:

Article Writing Best Practices:
1. Use clear, descriptive titles
2. Include common customer phrases in content
3. Add relevant keywords and synonyms
4. Structure content with headers and bullet points
5. Keep articles focused on single topics

Improving Match Accuracy:
- Add FAQ-style questions to articles
- Include common misspellings in content
- Use customer language, not just internal terminology
- Tag articles with related topics

Testing Knowledge Base Integration:
1. Create a test conversation
2. Ask questions that match your article content
3. Verify relevant articles appear as suggestions
4. Adjust article content if matches are poor

Common Issues:
Issue: Articles not appearing
- Verify article is published
- Check knowledge base is enabled for Agent Copilot
- Wait for indexing to complete

Issue: Wrong articles appearing
- Review article titles and content
- Check for duplicate or similar articles
- Improve article specificity""",
        "category": "Knowledge Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_047",
        "title": "Agent Copilot NLU Confidence Settings Deep Dive",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-nlu-confidence-deep-dive/",
        "content": """In-depth guide to understanding and configuring NLU confidence thresholds for Agent Copilot.

What is NLU Confidence?
Natural Language Understanding (NLU) confidence is a score from 0.0 to 1.0 that indicates how certain the AI is that it has correctly understood the customer's intent and matched it to relevant content.

How Confidence Affects Suggestions:
- If confidence score >= threshold: Suggestion is shown
- If confidence score < threshold: Suggestion is hidden

Default Confidence Threshold: 0.7 (70%)

Adjusting the Threshold:

To Access NLU Settings:
1. Navigate to Admin > AI > Agent Copilot Settings
2. Find "NLU Confidence Threshold"
3. Adjust the slider or enter a value

Threshold Guidelines:
0.4-0.5: Very permissive
- More suggestions appear
- Some may be less relevant
- Good for new implementations or testing

0.6-0.7: Balanced (recommended)
- Good mix of quantity and quality
- Standard for most deployments
- Start here and adjust based on feedback

0.8-0.9: Conservative
- Only high-confidence suggestions
- Fewer suggestions overall
- Use for regulated industries or sensitive topics

Signs Your Threshold is Too High:
- Agents rarely see suggestions
- Suggestions only appear for exact phrase matches
- Agents report the feature "doesn't work"
- Very low suggestion acceptance rate (because agents aren't getting suggestions to accept)

Signs Your Threshold is Too Low:
- Too many irrelevant suggestions
- Agents ignore suggestions due to noise
- Knowledge articles don't match queries
- High suggestion dismissal rate

Finding the Right Balance:
1. Start at 0.6-0.7
2. Monitor suggestion acceptance rate
3. Gather agent feedback
4. Adjust in 0.05 increments
5. Re-evaluate after 1-2 weeks

Monitoring NLU Performance:
- Check Analytics > Agent Copilot dashboard
- Review acceptance rates by queue/team
- Track confidence score distribution
- Compare before/after threshold changes""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_048",
        "title": "Agent Copilot Worked Last Week But Stopped - Troubleshooting",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-stopped-working/",
        "content": """Troubleshooting guide when Agent Copilot was working previously but has stopped.

Initial Assessment:
When Agent Copilot stops working after previously functioning, check for recent changes:

Recent Changes to Investigate:
1. Queue configuration changes
2. Knowledge base modifications
3. Permission or role updates
4. Genesys Cloud platform updates
5. Browser or desktop client updates

Step-by-Step Troubleshooting:

Step 1: Check for System Issues
- Visit Genesys Cloud status page
- Check for service disruptions
- Look for maintenance windows

Step 2: Verify No Configuration Changes
1. Admin > Contact Center > Queues
   - Is Agent Copilot still enabled?
   - Were any settings modified?

2. Admin > Knowledge > Knowledge Bases
   - Is the knowledge base still active?
   - Were articles unpublished?

3. Admin > AI > Agent Copilot Settings
   - Was the threshold changed?
   - Were any features disabled?

Step 3: Check Knowledge Base Status
- Articles may have been unpublished
- Knowledge base may have been disconnected
- Content may have been deleted

Step 4: Verify Agent Permissions
- Role permissions may have been modified
- User may have been moved to different role
- Division access may have changed

Step 5: Browser and Client Issues
If affecting single user:
1. Clear browser cache completely
2. Log out and back into Genesys Cloud
3. Try different browser
4. Check for browser extensions blocking

Step 6: Review Recent Admin Activity
1. Admin > Audit > Configuration Changes
2. Filter for Agent Copilot related changes
3. Identify what was modified
4. Revert changes if needed

Common Causes:
- Someone accidentally disabled at queue level
- Knowledge base maintenance unpublished articles
- Threshold was raised too high
- Browser cache serving old client code
- Permission change during role cleanup

Resolution:
Once root cause identified, revert the change or reconfigure as needed. Test thoroughly before confirming resolution.""",
        "category": "Troubleshooting",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_049",
        "title": "Agent Copilot Permissions and Role Configuration",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-permissions/",
        "content": """Configure user permissions for Agent Copilot access.

Required Permissions for Agents:
To use Agent Copilot, agents need the following permission:
- Agent Copilot > View

This permission allows:
- Viewing AI suggestions during interactions
- Clicking suggestions to use them
- Viewing knowledge cards

Administrator Permissions:
To configure Agent Copilot, administrators need:
- Agent Copilot > Admin
- Knowledge > Admin (for knowledge base settings)
- Routing > Queue > Edit (for queue settings)

Checking Current Permissions:
1. Navigate to Admin > People > Roles
2. Select the role assigned to agents
3. Look for "Agent Copilot" in the permission list
4. Verify "View" is checked

Adding Agent Copilot Permission to a Role:
1. Go to Admin > People > Roles
2. Select the agent role (or create a new one)
3. Click "Permissions" tab
4. Search for "Agent Copilot"
5. Check "View" permission
6. Save the role

Verifying User Role Assignment:
1. Go to Admin > People > Users
2. Select the user
3. Check "Roles" section
4. Verify correct role is assigned

Division Considerations:
- Users must have access to the division containing the queue
- Knowledge base division access may also be required
- Check division assignments if suggestions not appearing

Troubleshooting Permission Issues:
Problem: Agent has permission but no suggestions
- Verify permission is on the ASSIGNED role (not a different role)
- Check user hasn't been moved to different role
- Ensure role permission changes have been saved
- Have user log out and back in

Problem: Admin can't configure Agent Copilot
- Verify admin has "Agent Copilot > Admin" permission
- Check admin has access to correct division
- Ensure admin role includes required ancillary permissions""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_050",
        "title": "Verifying Agent Copilot is Enabled - Quick Checklist",
        "url": "https://help.mypurecloud.com/articles/verify-agent-copilot-enabled/",
        "content": """Quick verification checklist to confirm Agent Copilot is properly enabled.

5-Minute Verification Checklist:

☐ 1. Organization Level - Agent Copilot Feature Enabled
Navigate to: Admin > Organization Settings > Features
Check: "Agent Copilot" is toggled ON
If OFF: Toggle on and save

☐ 2. Queue Level - Agent Copilot Enabled for Queue
Navigate to: Admin > Contact Center > Queues > [Your Queue]
Check: "Enable Agent Copilot" is toggled ON
If OFF: Toggle on, select knowledge base, and save

☐ 3. Knowledge Base - Connected and Has Content
Navigate to: Admin > Knowledge > Knowledge Bases
Check: At least one knowledge base is marked for Agent Copilot
Check: Knowledge base has PUBLISHED articles (not just drafts)

☐ 4. NLU Threshold - Set Appropriately
Navigate to: Admin > AI > Agent Copilot Settings
Check: Confidence threshold is between 0.5 and 0.7
If higher: Consider lowering to 0.6 for testing

☐ 5. Agent Permissions - Correct Role Assigned
Navigate to: Admin > People > Users > [Agent]
Check: Role includes "Agent Copilot > View" permission
If missing: Add permission to role

Quick Test:
1. Start a test interaction on the configured queue
2. Send a message matching known knowledge base content
3. Wait 3-5 seconds for suggestions to load
4. Suggestions should appear in the agent desktop panel

If All Checks Pass But Still Not Working:
- Clear browser cache
- Try incognito/private window
- Check browser console for errors
- Verify network connectivity
- Contact Genesys support

Status Summary:
☐ Organization: Enabled / Disabled
☐ Queue: Enabled / Disabled
☐ Knowledge Base: Connected / Not Connected
☐ Articles: Published / Draft Only
☐ Threshold: ___ (0.0-1.0)
☐ Permissions: Granted / Missing""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_051",
        "title": "Agent Copilot Desktop Panel Configuration",
        "url": "https://help.mypurecloud.com/articles/agent-copilot-desktop-panel/",
        "content": """Configure the Agent Copilot panel in the agent desktop interface.

Agent Copilot Panel Overview:
The Agent Copilot panel appears in the agent desktop during active interactions, displaying AI-generated suggestions and knowledge articles.

Panel Location:
- Default: Right side of agent desktop
- Can be customized via desktop layout configuration

Configuring Desktop Layout:

Access Desktop Configuration:
1. Navigate to Admin > Contact Center > Agent Desktop
2. Select your desktop layout
3. Click "Edit Layout"

Adding Agent Copilot Panel:
1. In layout editor, find "AI Assist" or "Agent Copilot" widget
2. Drag to desired position (right panel recommended)
3. Configure panel settings
4. Save layout

Panel Display Options:
- Panel width: Adjustable
- Default expanded/collapsed: Configurable
- Auto-show on interaction: Enable/disable

What Appears in the Panel:
1. Suggested Responses - AI-generated reply suggestions
2. Knowledge Cards - Relevant articles from knowledge base
3. Sentiment Indicator - Customer emotion detection
4. Quick Actions - Contextual action buttons

Customizing Panel Behavior:

Suggestion Settings:
- Number of suggestions to display (1-5)
- Click-to-insert vs click-to-copy
- Show/hide confidence scores

Knowledge Card Settings:
- Number of cards to show
- Expand/collapse behavior
- Direct link to full article

Agent Controls:
- Minimize/expand panel
- Refresh suggestions
- Report irrelevant suggestion

Troubleshooting Panel Issues:

Panel Not Appearing:
1. Verify Agent Copilot is in desktop layout
2. Check layout is assigned to user
3. Confirm Agent Copilot is enabled for queue
4. Clear browser cache

Panel Appears Empty:
1. Verify active conversation exists
2. Check knowledge base connection
3. Confirm NLU threshold settings
4. Wait 3-5 seconds for suggestions to load

Panel Showing Wrong Information:
1. Refresh the page
2. Check correct layout is assigned
3. Verify correct queue configuration""",
        "category": "Agent Copilot",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    # New articles for expanded KB coverage
    {
        "id": "sample_052",
        "title": "Genesys Cloud Billing and Invoicing Overview",
        "url": "https://help.mypurecloud.com/articles/billing-overview/",
        "content": """Understanding Genesys Cloud billing, invoices, and usage tracking.

Billing Models:
- Concurrent User: Based on simultaneous logged-in users
- Named User: Fixed number of assigned users
- Usage-Based: Pay per interaction or minute

Viewing Your Invoice:
1. Navigate to Admin > Billing
2. Select billing period
3. View invoice details and breakdown

Common Invoice Line Items:
- Platform license fees
- Add-on features (WEM, Analytics, AI)
- Usage overages
- Support tier

Billing Disputes:
To dispute a charge:
1. Open a support case
2. Include invoice number and line item
3. Provide reason for dispute

Setting Up Billing Alerts:
- Configure usage thresholds
- Email notifications for approaching limits
- Monthly spend summaries""",
        "category": "Billing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_053",
        "title": "Workforce Management Scheduling Best Practices",
        "url": "https://help.mypurecloud.com/articles/wfm-scheduling/",
        "content": """Optimize agent schedules with Genesys Cloud Workforce Management.

Creating Effective Schedules:
1. Import historical data (90+ days recommended)
2. Define service level targets
3. Set shrinkage factors
4. Generate schedule recommendations

Schedule Components:
- Shifts: Work periods with start/end times
- Activities: Tasks within shifts (calls, breaks, training)
- Time Off: Planned absences

Intraday Management:
- Real-time adherence monitoring
- Schedule adjustment tools
- Agent reforecasting

Best Practices:
1. Review forecasts weekly
2. Build buffer into schedules
3. Cross-train agents for flexibility
4. Use shift bidding for engagement""",
        "category": "Workforce Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_054",
        "title": "Real-Time Analytics Dashboard Guide",
        "url": "https://help.mypurecloud.com/articles/analytics-dashboard/",
        "content": """Configure and use real-time analytics dashboards in Genesys Cloud.

Available Dashboard Types:
- Queue Performance
- Agent Status
- Campaign Metrics
- Interaction Details

Creating Custom Dashboards:
1. Navigate to Performance > Dashboards
2. Click "Create Dashboard"
3. Add widgets from library
4. Configure data sources and refresh rates

Key Metrics to Monitor:
- Service Level (target: 80/20)
- Average Handle Time
- Abandonment Rate
- Agent Occupancy
- Queue Wait Time

Setting Up Alerts:
1. Define threshold conditions
2. Configure notification channels
3. Set escalation rules

Sharing Dashboards:
- Export as PDF
- Share with roles/users
- Schedule automated reports""",
        "category": "Analytics",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_055",
        "title": "CRM Integration Setup Guide",
        "url": "https://help.mypurecloud.com/articles/crm-integration/",
        "content": """Integrate Genesys Cloud with popular CRM systems.

Supported CRM Integrations:
- Salesforce (native integration)
- Microsoft Dynamics 365
- Zendesk
- ServiceNow
- Custom via API

Salesforce Integration Steps:
1. Install Genesys Cloud for Salesforce package
2. Configure Connected App
3. Set up OAuth credentials
4. Map data fields
5. Test integration

Features Available:
- Screen pop with customer data
- Click-to-dial
- Automatic case creation
- Call logging
- Activity history sync

Troubleshooting:
- Check OAuth token validity
- Verify field mapping
- Review API call logs
- Test with sample customer""",
        "category": "Integrations",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_056",
        "title": "Security and Compliance Settings",
        "url": "https://help.mypurecloud.com/articles/security-compliance/",
        "content": """Configure security settings and ensure compliance in Genesys Cloud.

Security Features:
- Single Sign-On (SSO) support
- Multi-factor authentication
- IP access restrictions
- Session timeout controls
- Audit logging

Compliance Certifications:
- SOC 2 Type II
- HIPAA
- GDPR
- PCI DSS
- ISO 27001

Configuring SSO:
1. Navigate to Admin > Integrations > SSO
2. Select identity provider
3. Upload metadata
4. Configure attribute mapping
5. Test authentication

Data Retention Settings:
- Recording retention periods
- Transcript storage duration
- Analytics data lifecycle
- Backup policies

Access Control:
- Role-based permissions
- Division access
- Queue membership
- Feature restrictions""",
        "category": "Security",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_057",
        "title": "Outbound Campaign Management",
        "url": "https://help.mypurecloud.com/articles/outbound-campaigns/",
        "content": """Set up and manage outbound dialing campaigns.

Campaign Types:
- Preview Dialing: Agent reviews before call
- Progressive Dialing: Auto-dial with agent connection
- Predictive Dialing: Algorithm-based pacing

Creating a Campaign:
1. Define contact list
2. Set dialing rules
3. Configure call analysis
4. Assign agents/queues
5. Set schedule and pacing

Contact List Management:
- Import from CSV
- DNC list compliance
- Time zone handling
- Contact attempt limits

Campaign Metrics:
- Connect rate
- Agent utilization
- Abandonment rate
- Conversion rate

Compliance Features:
- DNC list checking
- Time-of-day restrictions
- Abandonment rate controls
- Call recording consent""",
        "category": "Outbound",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_058",
        "title": "Email Channel Configuration",
        "url": "https://help.mypurecloud.com/articles/email-channel/",
        "content": """Configure email routing and handling in Genesys Cloud.

Setting Up Email:
1. Create email domain in Admin
2. Configure DNS records (MX, SPF, DKIM)
3. Create email routing flow
4. Assign to queue

Email Routing Options:
- Skills-based routing
- Priority routing
- Round-robin distribution
- Preferred agent routing

Email Templates:
- Create standard responses
- Use substitution variables
- Attach files
- Configure signatures

Auto-Response Setup:
1. Create acknowledgment template
2. Set business hours
3. Configure out-of-office handling
4. Define escalation rules

Best Practices:
- Set SLA response times
- Use email parsing for categorization
- Monitor queue depths
- Track first response time""",
        "category": "Email",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_059",
        "title": "Chat Widget Customization",
        "url": "https://help.mypurecloud.com/articles/chat-widget/",
        "content": """Customize the web chat widget for your website.

Widget Configuration:
- Colors and branding
- Position on page
- Welcome message
- Pre-chat survey

Installation Steps:
1. Generate deployment code
2. Add script to website
3. Configure targeting rules
4. Test functionality

Customization Options:
- Custom CSS styling
- Logo upload
- Button text
- Language localization

Pre-Chat Survey Fields:
- Customer name
- Email address
- Issue category
- Custom fields

Proactive Chat:
- Time-based triggers
- Page-based triggers
- Exit intent detection
- Returning visitor rules

Mobile Optimization:
- Responsive design
- Touch-friendly controls
- Smaller footprint option""",
        "category": "Digital",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_060",
        "title": "Speech Analytics Configuration",
        "url": "https://help.mypurecloud.com/articles/speech-analytics/",
        "content": """Configure speech analytics for conversation insights.

Speech Analytics Features:
- Automatic transcription
- Sentiment detection
- Topic spotting
- Compliance phrase detection

Setting Up Topics:
1. Navigate to Admin > Speech Analytics
2. Create topic with phrases
3. Set confidence threshold
4. Assign to programs

Sentiment Analysis:
- Overall sentiment score
- Sentiment progression
- Agent vs customer sentiment
- Trigger-based alerts

Compliance Monitoring:
- Required phrase detection
- Forbidden phrase alerts
- Script adherence scoring
- Automatic flagging

Using Analytics:
- Search transcripts
- Filter by topic/sentiment
- Export for review
- Identify training needs

Integration with QM:
- Auto-select interactions
- Topic-based evaluation
- Sentiment-triggered coaching""",
        "category": "Analytics",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_061",
        "title": "IVR Flow Builder Guide",
        "url": "https://help.mypurecloud.com/articles/ivr-flow-builder/",
        "content": """Build interactive voice response flows with Architect.

Flow Components:
- Menus: Digit/speech input options
- Audio: Prompts and announcements
- Data: Variable management
- Actions: Transfers, recordings, integrations

Creating a Basic IVR:
1. Open Architect
2. Create new Inbound Call Flow
3. Add greeting audio
4. Create menu structure
5. Configure routing destinations

Menu Best Practices:
- Limit to 4-5 options
- Most common options first
- Always offer agent option
- Confirm selections

Speech Recognition:
- Enable/configure ASR
- Define grammar sets
- Set confidence thresholds
- Handle no-match scenarios

Advanced Features:
- Callback scheduling
- Customer authentication
- Database lookups
- Dynamic routing""",
        "category": "IVR",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_062",
        "title": "Agent Performance Evaluation Forms",
        "url": "https://help.mypurecloud.com/articles/evaluation-forms/",
        "content": """Create and manage quality evaluation forms.

Form Design Principles:
- Keep forms focused (15-25 questions)
- Use consistent scoring scales
- Include critical auto-fail items
- Balance objective and subjective criteria

Creating an Evaluation Form:
1. Navigate to Admin > Quality > Forms
2. Click "Create Form"
3. Add question groups
4. Configure scoring weights
5. Set auto-fail conditions
6. Publish form

Question Types:
- Yes/No
- Range scale (1-5)
- Multiple choice
- Free text comments

Scoring Configuration:
- Weight by question importance
- Set passing threshold
- Configure auto-fail triggers
- Enable partial credit

Calibration:
- Schedule calibration sessions
- Compare evaluator scores
- Identify scoring drift
- Maintain consistency""",
        "category": "Quality Management",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_063",
        "title": "Recording and Storage Management",
        "url": "https://help.mypurecloud.com/articles/recording-management/",
        "content": """Manage call recordings and storage in Genesys Cloud.

Recording Types:
- Call recordings
- Screen recordings
- Chat transcripts
- Email archives

Recording Policies:
- All calls
- Selective recording
- On-demand recording
- Compliance holds

Storage Options:
- Genesys Cloud storage
- AWS S3 export
- Azure Blob export
- Local download

Retention Settings:
1. Navigate to Admin > Recording
2. Set retention period
3. Configure auto-delete
4. Define hold policies

Access Control:
- Role-based viewing
- Download permissions
- Delete restrictions
- Audit logging

Export and Backup:
- Bulk export tools
- Scheduled exports
- Metadata inclusion
- Encryption options""",
        "category": "Recording",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_064",
        "title": "API Authentication and Rate Limits",
        "url": "https://help.mypurecloud.com/articles/api-authentication/",
        "content": """Authenticate to Genesys Cloud APIs and understand rate limits.

Authentication Methods:
- OAuth Client Credentials
- OAuth Authorization Code
- OAuth Implicit Grant
- SAML2 Bearer

Creating OAuth Client:
1. Navigate to Admin > Integrations > OAuth
2. Click "Add Client"
3. Select grant type
4. Configure scopes
5. Save and copy credentials

Rate Limits:
- 300 requests per minute (default)
- 180,000 requests per day
- Burst allowance for spikes
- Per-organization limits

Handling Rate Limits:
- Check X-RateLimit headers
- Implement exponential backoff
- Cache responses when possible
- Use webhooks for real-time

Best Practices:
- Use appropriate scopes
- Rotate credentials regularly
- Monitor API usage
- Handle token refresh""",
        "category": "API",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_065",
        "title": "Callback Queue Configuration",
        "url": "https://help.mypurecloud.com/articles/callback-queues/",
        "content": """Set up customer callback functionality.

Callback Types:
- In-queue callback
- Scheduled callback
- Web callback
- Voicemail callback

Configuring In-Queue Callback:
1. Edit queue settings
2. Enable callback option
3. Set estimated wait threshold
4. Configure callback flow

Callback Flow Requirements:
- Greeting audio
- Phone number collection
- Confirmation message
- Fallback handling

Scheduling Options:
- Immediate callback
- Customer-selected time
- Business hours only
- Timezone handling

Metrics and Reporting:
- Callback request volume
- Callback completion rate
- Average callback time
- Customer satisfaction""",
        "category": "Voice",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_066",
        "title": "Social Media Channel Integration",
        "url": "https://help.mypurecloud.com/articles/social-media/",
        "content": """Connect social media channels to Genesys Cloud.

Supported Platforms:
- Facebook Messenger
- Twitter/X Direct Messages
- WhatsApp Business
- Instagram Direct
- LINE

Facebook Integration:
1. Create Facebook page
2. Configure in Admin > Messaging
3. Authenticate with Facebook
4. Map to queue
5. Test messaging

WhatsApp Setup:
- WhatsApp Business Account required
- Phone number verification
- Message template approval
- 24-hour response window

Routing Configuration:
- Channel-specific queues
- Combined digital queue
- Skills-based routing
- Priority settings

Response Management:
- Message templates
- Rich media support
- Quick replies
- Automated responses""",
        "category": "Digital",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_067",
        "title": "Agent Scripting Tool",
        "url": "https://help.mypurecloud.com/articles/agent-scripting/",
        "content": """Create guided agent scripts for consistent interactions.

Script Components:
- Pages: Individual screens
- Questions: Customer data collection
- Actions: System operations
- Navigation: Flow control

Building a Script:
1. Navigate to Admin > Scripts
2. Create new script
3. Design page layout
4. Add questions/actions
5. Configure navigation
6. Publish to queue

Question Types:
- Text input
- Dropdown selection
- Radio buttons
- Checkboxes
- Date/time picker

Action Types:
- Update customer record
- Create case/ticket
- Transfer call
- Send email
- Schedule callback

Variables and Logic:
- Store responses in variables
- Conditional page display
- Dynamic content
- External data lookups""",
        "category": "Agent Tools",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_068",
        "title": "Wrap-Up Codes Configuration",
        "url": "https://help.mypurecloud.com/articles/wrap-up-codes/",
        "content": """Configure and manage interaction wrap-up codes.

Wrap-Up Code Purpose:
- Categorize interactions
- Track disposition reasons
- Enable reporting
- Drive workflow automation

Creating Wrap-Up Codes:
1. Navigate to Admin > Contact Center > Wrap-Up Codes
2. Click "Create"
3. Enter code name
4. Assign to queues
5. Set as default if needed

Best Practices:
- Keep list manageable (10-20 codes)
- Use clear, specific names
- Avoid overlapping categories
- Review usage regularly

Queue Assignment:
- Global codes (all queues)
- Queue-specific codes
- Required vs optional
- Default selection

Wrap-Up Settings:
- Timeout duration
- Auto-complete behavior
- Multiple code selection
- Required fields

Reporting:
- Wrap-up code distribution
- Agent usage patterns
- Trend analysis
- Quality correlation""",
        "category": "Contact Center",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_069",
        "title": "Data Actions and Integrations",
        "url": "https://help.mypurecloud.com/articles/data-actions/",
        "content": """Create custom integrations using Data Actions.

Data Action Use Cases:
- CRM lookups
- Database queries
- External API calls
- Custom workflows

Creating a Data Action:
1. Navigate to Admin > Integrations > Actions
2. Create new action
3. Configure request settings
4. Map response data
5. Test and publish

Request Configuration:
- HTTP method (GET, POST, PUT)
- URL with variables
- Headers
- Authentication
- Request body

Response Mapping:
- Parse JSON response
- Map to output variables
- Handle errors
- Set success criteria

Using in Architect:
- Add Call Data Action node
- Select action
- Map input variables
- Handle success/failure paths

Troubleshooting:
- Check action logs
- Verify authentication
- Test with Postman
- Review variable mapping""",
        "category": "Integrations",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_070",
        "title": "Presence and Status Management",
        "url": "https://help.mypurecloud.com/articles/presence-management/",
        "content": """Configure agent presence states and status management.

System Presences:
- Available
- Busy
- Away
- Break
- Meal
- Meeting
- Training
- Offline

Custom Presences:
1. Navigate to Admin > Presence
2. Click "Add Presence"
3. Define status name
4. Set routing behavior
5. Configure timeout

Presence Definitions:
- On Queue: Receiving interactions
- Off Queue: Available but not receiving
- Out of Office: Fully unavailable

Timeout Settings:
- Auto-return to available
- Escalation alerts
- Supervisor notifications
- Adherence tracking

Reporting:
- Time in status
- Status change frequency
- Adherence percentage
- Productive time metrics""",
        "category": "Contact Center",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_071",
        "title": "Supervisor Monitoring Tools",
        "url": "https://help.mypurecloud.com/articles/supervisor-monitoring/",
        "content": """Use supervisor tools to monitor and assist agents.

Monitoring Capabilities:
- Listen (silent monitoring)
- Coach (agent can hear)
- Barge (join conversation)
- Take over (assume interaction)

Setting Up Monitoring:
1. Assign supervisor role
2. Grant monitoring permissions
3. Configure queue access
4. Set up notifications

Real-Time Views:
- Queue dashboard
- Agent status grid
- Interaction list
- Performance metrics

Coaching Features:
- One-way audio
- Text messaging
- Screen sharing
- Recording markers

Best Practices:
- Notify agents of monitoring policy
- Use for coaching, not punishment
- Document observations
- Follow up with feedback""",
        "category": "Supervision",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_072",
        "title": "Emergency Routing Configuration",
        "url": "https://help.mypurecloud.com/articles/emergency-routing/",
        "content": """Configure emergency and failover routing scenarios.

Emergency Triggers:
- Natural disasters
- System outages
- Building evacuations
- Network failures

Emergency Flow Setup:
1. Create emergency message
2. Build failover flow
3. Configure activation method
4. Test regularly

Activation Methods:
- Manual toggle in Admin
- Schedule-based
- API trigger
- Automated monitoring

Emergency Actions:
- Play closure message
- Route to overflow
- Enable remote agents
- Forward to mobile

Recovery Procedures:
1. Assess situation
2. Communicate to teams
3. Deactivate emergency mode
4. Monitor queue recovery
5. Document incident

Best Practices:
- Test quarterly
- Train all supervisors
- Document procedures
- Review after incidents""",
        "category": "Routing",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_073",
        "title": "Customer Journey Analytics",
        "url": "https://help.mypurecloud.com/articles/journey-analytics/",
        "content": """Track and analyze customer journeys across channels.

Journey Tracking Features:
- Cross-channel visibility
- Touchpoint mapping
- Outcome tracking
- Predictive engagement

Setting Up Journeys:
1. Enable journey tracking
2. Configure identity resolution
3. Define touchpoints
4. Set up event tracking

Customer Identity:
- Cookie-based tracking
- Authenticated sessions
- Phone number matching
- Email address linking

Journey Views:
- Individual customer timeline
- Aggregate journey maps
- Funnel analysis
- Drop-off identification

Predictive Features:
- Outcome prediction
- Next-best-action
- Engagement timing
- Channel preference

Reporting:
- Journey completion rates
- Average touchpoints
- Time to resolution
- Channel effectiveness""",
        "category": "Analytics",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_074",
        "title": "Bot Flow Creation Guide",
        "url": "https://help.mypurecloud.com/articles/bot-flows/",
        "content": """Build conversational bots in Genesys Cloud Architect.

Bot Types:
- Digital Bot: Chat/messaging
- Voice Bot: IVR with NLU
- Hybrid: Multi-channel support

Creating a Bot Flow:
1. Open Architect
2. Select Bot Flow type
3. Design conversation
4. Configure NLU intents
5. Add slot filling
6. Test and publish

Intent Configuration:
- Define user intents
- Add training utterances
- Set confidence thresholds
- Handle fallbacks

Slot Filling:
- Entity extraction
- Validation rules
- Confirmation prompts
- Default values

Bot Handoff:
- Escalation triggers
- Context transfer
- Agent routing
- Conversation summary

Testing:
- Use preview mode
- Test all paths
- Check NLU accuracy
- Monitor performance""",
        "category": "AI",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
    {
        "id": "sample_075",
        "title": "Multi-Site and Division Management",
        "url": "https://help.mypurecloud.com/articles/divisions/",
        "content": """Manage multiple sites and divisions in Genesys Cloud.

Division Concepts:
- Divisions: Logical groupings
- Sites: Physical locations
- Groups: User collections
- Queues: Routing entities

Creating Divisions:
1. Navigate to Admin > Organization > Divisions
2. Click "Add Division"
3. Name and describe
4. Assign objects

Division Benefits:
- Access control
- Data segregation
- Separate reporting
- Regional compliance

Site Configuration:
- Physical address
- Time zone
- Emergency number
- Site-specific settings

Cross-Division Routing:
- Enable division overflow
- Configure priority
- Set time conditions
- Track cross-site metrics

Reporting:
- Division-level dashboards
- Site comparison
- Global aggregation
- Drill-down capability""",
        "category": "Administration",
        "product": "Genesys Cloud CX",
        "scraped_at": datetime.now().isoformat(),
    },
]


def get_sample_documents() -> List[Dict]:
    """Get sample documents for demo purposes."""
    return SAMPLE_DOCUMENTS


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrape Genesys documentation")
    parser.add_argument("--sample", action="store_true", help="Use sample data instead of scraping")
    parser.add_argument("--output", default="data/genesys_docs.json", help="Output file path")
    args = parser.parse_args()

    if args.sample:
        print("Using sample documents...")
        docs = get_sample_documents()
    else:
        print("Scraping live Genesys documentation...")
        docs = scrape_genesys_docs()

    save_documents(docs, args.output)
    print(f"\nDone! {len(docs)} documents saved to {args.output}")

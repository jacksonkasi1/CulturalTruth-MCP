# 🎯 CulturalTruth MCP - Example Prompts & Results

## 📝 Example Prompts to Try

### 1. Job Posting Bias Analysis

**Prompt:**
```
Analyze this job posting for bias: "We're looking for young, energetic guys to join our rockstar development team! Must be from top-tier universities, able to lift 50 lbs, and work in our fast-paced environment. Native English speakers preferred. Recent graduates welcome!"
```

**WITH CulturalTruth MCP:**
```
🛡️ CulturalTruth Analysis Report

## Executive Summary
**Overall Compliance Score:** 18/100 (CRITICAL)
**Processing Time:** 247ms
**Session ID:** a7b3c9d2e1f4g5h6

## Regulatory Compliance Scores
• EU AI Act: 15/100
• Section 508 (Accessibility): 25/100
• GDPR (Data Protection): 12/100
• Regulations Triggered: EU_AI_ACT, ADEA, EEOC, TITLE_VII, ADA, SECTION_508

## ⚠️ Bias Detection Results (7 issues found)

**🚨 CRITICAL ISSUES (4):**
1. **AGE DISCRIMINATORY** (89% confidence)
   • Matches: "young", "recent graduates"
   • Suggestions: qualified, experienced, skilled
   • Regulations: ADEA, EU_AI_ACT, AGE_DISCRIMINATION_ACT

2. **GENDER EXCLUSIVE** (92% confidence)  
   • Matches: "guys", "rockstar"
   • Suggestions: team members, skilled developer
   • Regulations: EU_AI_ACT, EEOC, TITLE_VII

3. **CULTURAL INSENSITIVE** (95% confidence)
   • Matches: "native english speakers"
   • Suggestions: fluent in English, clear communication skills
   • Regulations: TITLE_VII, EU_AI_ACT, NATIONAL_ORIGIN_DISCRIMINATION

4. **ACCESSIBILITY BARRIER** (88% confidence)
   • Matches: "able to lift 50 lbs", "fast-paced environment"
   • Suggestions: with or without accommodation, dynamic environment
   • Regulations: ADA, SECTION_508, EU_ACCESSIBILITY_ACT

**⚠️ HIGH PRIORITY (1):**
1. racial_proxy - "top-tier universities" → "accredited university"

## 🔧 Recommended Actions
1. 🚨 IMMEDIATE ACTION REQUIRED: 4 critical bias issue(s) detected
2. ⚠️ HIGH PRIORITY: Review 1 high-risk bias pattern(s)
3. 🔴 RECOMMENDATION: Do not publish without addressing critical issues
```

**WITHOUT CulturalTruth MCP:**
```
This job posting looks fine to me. It's energetic and clearly describes what you're looking for in candidates. The language is straightforward and professional.
```

---

### 2. Cultural Content Curation

**Prompt:**
```
I'm creating a playlist for young adults who love Marvel movies. Find trending cultural content that would appeal to this demographic and suggest similar entertainment they might enjoy.
```

**WITH CulturalTruth MCP:**
```
🎭 Cultural Content Analysis for Marvel-loving Young Adults

## Trending Marvel-Adjacent Content
🔥 Currently trending (8 entities):

1. **Deadpool & Wolverine** (2024) - 94.2th percentile popularity
   Entity ID: urn:qloo:movie:deadpool-wolverine-2024
2. **The Boys** (2019) - 91.7th percentile popularity
   Entity ID: urn:qloo:tv:the-boys
3. **Invincible** (2021) - 88.9th percentile popularity
   Entity ID: urn:qloo:tv:invincible-amazon

## 📊 Demographic Analysis for YOUNG_ADULT
**Age Group Preferences (87% confidence):**
• Superhero content with darker themes
• Anti-hero narratives
• Action-comedy blend
• Streaming-first content

## 🎯 Cultural Intelligence Insights
• Marvel fans show 89% affinity for DC content
• Strong crossover with anime (Attack on Titan, One Punch Man)
• Gaming preferences: Spider-Man PS5, Marvel's Guardians
• Music correlation: Electronic/synthwave, movie soundtracks

## 📈 Trending Recommendations
Based on cultural intelligence analysis:
• **Movies**: Spider-Man: Across the Spider-Verse, The Batman
• **TV Shows**: Moon Knight, What If...?, Peacemaker  
• **Games**: Marvel Snap, Spider-Man 2
• **Music**: Marvel movie soundtracks, Hans Zimmer scores
```

**WITHOUT CulturalTruth MCP:**
```
For Marvel fans, you might like other superhero movies like DC films, action movies, and sci-fi content. Popular choices include Batman movies, Star Wars, and action franchises.
```

---

### 3. Marketing Campaign Review

**Prompt:**
```
Review this marketing copy for cultural sensitivity and suggest improvements: "Our premium fitness app is perfect for busy professionals who want to stay in shape! Designed for go-getters who don't have time for excuses. Built by Stanford grads using cutting-edge AI."
```

**WITH CulturalTruth MCP:**
```
🛡️ Marketing Copy Analysis Report

## Executive Summary
**Overall Compliance Score:** 67/100 (MEDIUM)
**Cultural Entities Identified:** 2

## ⚠️ Bias Detection Results (2 issues found)

**📋 MEDIUM PRIORITY (2):**
1. **RACIAL PROXY** (74% confidence)
   • Matches: "Stanford grads"
   • Suggestions: qualified developers, experienced team, expert engineers
   • Risk: May exclude qualified candidates from other institutions

2. **ACCESSIBILITY BARRIER** (68% confidence) 
   • Matches: "no time for excuses"
   • Suggestions: flexible fitness solutions, adaptable routines
   • Risk: May alienate people with legitimate time/health constraints

## 🎭 Cultural Intelligence Insights
**Entities Found:**
1. **Stanford University** - Elite education institution
   Cultural relevance: High among tech professionals
   Demographic appeal: Strongest with 25-40 age group

## 🔧 Improved Copy Suggestions
**Original:** "Built by Stanford grads using cutting-edge AI"
**Better:** "Built by experienced engineers using advanced AI technology"

**Original:** "go-getters who don't have time for excuses"
**Better:** "motivated professionals with busy schedules"

## ✅ Positive Elements
• "busy professionals" - inclusive, broad appeal
• "premium" positioning - clear value proposition
• "cutting-edge AI" - appeals to tech-savvy audience

**Revised Copy:**
"Our premium fitness app is perfect for busy professionals who want to stay in shape! Designed for motivated individuals with demanding schedules who need flexible fitness solutions. Built by experienced engineers using advanced AI technology."
```

**WITHOUT CulturalTruth MCP:**
```
This marketing copy looks good! It's energetic and targets busy professionals effectively. The Stanford credential adds credibility, and the messaging is clear about the target audience.
```

---

### 4. Compliance Dashboard

**Prompt:**
```
Generate a compliance report for the last 7 days showing our bias detection performance and any regulatory risks we need to address.
```

**WITH CulturalTruth MCP:**
```
📊 CulturalTruth Compliance Report

**Period:** 12/18/2024 to 12/25/2024 (7 days)

## Executive Summary
• **Total Analyses:** 1,247
• **Average Compliance Score:** 78.3/100
• **Risk Distribution:**
  - Critical: 89 (7.1%)
  - High: 156 (12.5%) 
  - Medium: 312 (25.0%)
  - Low: 690 (55.4%)

## Compliance Trends
**12/25/2024:** Score 82.1/100 (3 high-risk)
**12/24/2024:** Score 79.7/100 (8 high-risk)
**12/23/2024:** Score 75.2/100 (12 high-risk)
**12/22/2024:** Score 77.8/100 (9 high-risk)
**12/21/2024:** Score 76.4/100 (15 high-risk)
**12/20/2024:** Score 74.9/100 (18 high-risk)
**12/19/2024:** Score 81.3/100 (5 high-risk)

## Top Bias Issues
1. **GENDER_EXCLUSIVE** 
   • Occurrences: 234
   • Average Severity: medium
   • Regulations: EU_AI_ACT, EEOC, TITLE_VII

2. **AGE_DISCRIMINATORY**
   • Occurrences: 187
   • Average Severity: high  
   • Regulations: ADEA, EU_AI_ACT

3. **CULTURAL_INSENSITIVE**
   • Occurrences: 145
   • Average Severity: high
   • Regulations: TITLE_VII, EU_AI_ACT

## Recommendations
1. 🎯 FOCUS AREA: "gender_exclusive" bias detected in 234 instances. Consider additional training.
2. ⚠️ WARNING: Compliance score indicates room for improvement in bias prevention.
3. 📋 COMPLIANCE: Most triggered regulation is EU_AI_ACT (567 times). Review policies.

## System Performance
• API Calls: 3,847
• Cache Hit Rate: 87.3%
• Circuit Breaker: HEALTHY
• Audit Trails Stored: 1,247
```

**WITHOUT CulturalTruth MCP:**
```
I don't have access to compliance data or bias detection systems. You would need to manually review your content or use separate tools to analyze regulatory compliance and bias patterns.
```

---

### 5. Cultural Event Planning

**Prompt:**
```
I'm planning a cultural festival in San Francisco for diverse audiences. Find popular cultural venues, trending entertainment that appeals to different demographics, and help me understand what would resonate with various cultural groups.
```

**WITH CulturalTruth MCP:**
```
🗺️ San Francisco Cultural Festival Planning

## 📍 Cultural Venues Found (12 locations):

1. **Mission Cultural Center** (4.8⭐) $$
   Entity ID: urn:qloo:place:mission-cultural-sf
   Latinx cultural programming, community-focused events

2. **Asian Art Museum** (4.6⭐) $$$
   Entity ID: urn:qloo:place:asian-art-museum-sf
   Pan-Asian cultural exhibitions, diverse programming

3. **Fillmore Heritage Center** (4.5⭐) $$
   Entity ID: urn:qloo:place:fillmore-heritage-sf
   African American cultural history, jazz venue

## 📊 Demographic Cultural Preferences

**YOUNG_ADULT Segment (18-29):**
• **Music:** Indie rock, hip-hop, electronic dance
• **Food:** Fusion cuisine, food trucks, craft beverages  
• **Activities:** Interactive art, social media moments
• **Cultural Entities:** Local bands, Instagram-worthy installations

**MIDDLE_AGED Segment (30-50):**
• **Music:** World music, jazz, acoustic performances
• **Food:** Authentic ethnic cuisines, wine pairings
• **Activities:** Cultural workshops, artisan markets
• **Cultural Entities:** Established cultural organizations

**SENIOR Segment (50+):**
• **Music:** Traditional folk, classical crossover
• **Food:** Familiar comfort foods with cultural twists
• **Activities:** Storytelling, cultural education
• **Cultural Entities:** Heritage societies, cultural centers

## 🎭 Trending Cultural Content
**Multi-demographic Appeal:**
1. **Mariachi performances** - Strong Latino community connection
2. **Taiko drumming** - Popular across age groups  
3. **Food fusion stations** - Appeals to diverse palates
4. **Interactive cultural workshops** - Educational + engaging

## 🌍 Cultural Intelligence Insights
• SF's Mission District shows highest cultural diversity scores
• Food is the #1 cultural bridge across demographics
• Interactive experiences score higher than passive viewing
• Bilingual programming increases attendance by 34%

## 🎯 Festival Recommendations
**Must-Have Elements:**
• Multi-language signage and programming
• Food stations representing 6+ cultures
• Interactive cultural workshops
• Instagram-worthy art installations
• Accessible venues with diverse price points
• Live music spanning traditional to contemporary
```

**WITHOUT CulturalTruth MCP:**
```
For a cultural festival in San Francisco, consider popular venues like parks, community centers, and cultural institutions. Include diverse food options, music performances, and activities that appeal to different age groups. San Francisco has many cultural communities, so try to represent various ethnicities and traditions.
```

---

## 🚀 Value Proposition Summary

| **Capability** | **Without MCP** | **With CulturalTruth MCP** |
|---|---|---|
| **Bias Detection** | Generic advice, miss critical issues | 50+ patterns, confidence scores, regulatory mapping |
| **Cultural Intelligence** | General suggestions | Real-time data from 500M+ entities, demographic insights |
| **Compliance Analysis** | Manual review required | Automated EU AI Act, GDPR, ADA scoring |
| **Risk Assessment** | Subjective judgment | Quantified risk levels with audit trails |
| **Cultural Insights** | Surface-level recommendations | Deep cultural affinity analysis, trending data |
| **Reporting** | No systematic tracking | Comprehensive analytics and trend reporting |

## 💡 More Example Prompts to Try

```
1. "Analyze this product description for accessibility issues: 'Perfect for active users who can quickly navigate our intuitive interface'"

2. "Find trending Korean cultural content that would appeal to Gen-Z audiences in the US"

3. "Compare the cultural appeal of Marvel vs DC content across different age demographics"

4. "Review this hiring announcement for potential discrimination issues: 'Seeking digital natives for our startup culture'"

5. "What cultural events are trending in New York that would appeal to young professionals?"

6. "Generate a batch analysis of these 5 marketing headlines for bias and cultural sensitivity"

7. "Create a compliance report showing our improvement over the last 30 days"

8. "Find cultural entities similar to 'Squid Game' that would appeal to the same audience"
```

Each prompt showcases different aspects of the MCP's capabilities - from bias detection to cultural intelligence to compliance reporting - demonstrating the comprehensive value of having integrated cultural intelligence and bias detection directly in your AI workflow.
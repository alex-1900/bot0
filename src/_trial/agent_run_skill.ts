import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

interface SkillMetadata {
    name: string;
    description: string;
    homepage: string;
    metadata: Record<string, unknown>;
}

interface Skill {
    path: string;
    metadata: SkillMetadata;
    content: string;
    commands: string[];
}

interface AgentResponse {
    skillName: string;
    command: string;
    reasoning: string;
}

const SKILLS_DIR = join(relative(process.cwd(), '.'), 'src/_trial/skills');

function parseFrontmatter(content: string): { metadata: SkillMetadata; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match || !match[1]) {
        throw new Error('Invalid frontmatter format');
    }

    const frontmatterStr = match[1];
    const body = match[2] || '';
    const metadata: SkillMetadata = {
        name: '',
        description: '',
        homepage: '',
        metadata: {}
    };

    frontmatterStr.split('\n').forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            if (key && value) {
                if (key === 'metadata') {
                    try {
                        metadata.metadata = JSON.parse(value);
                    } catch {
                        // Ignore invalid JSON
                    }
                } else {
                    (metadata as unknown as Record<string, unknown>)[key] = value.replace(/^["']|["']$/g, '');
                }
            }
        }
    });

    return { metadata, body };
}

function extractCommands(body: string): string[] {
    const commandRegex = /`([^`]+)`/g;
    const commands: string[] = [];
    let match;

    while ((match = commandRegex.exec(body)) !== null) {
        const commandStr = match[1];
        if (commandStr) {
            const command = commandStr.trim();
            if (command.startsWith('obsidian-cli') || command.startsWith('obsidian://')) {
                commands.push(command);
            }
        }
    }

    return commands;
}

function loadSkills(): Skill[] {
    const skills: Skill[] = [];

    if (!existsSync(SKILLS_DIR)) {
        console.log(`Skills directory not found: ${SKILLS_DIR}`);
        return skills;
    }

    const categories = readdirSync(SKILLS_DIR);

    for (const category of categories) {
        const categoryPath = join(SKILLS_DIR, category);

        const skillFiles = readdirSync(categoryPath).filter(f => f.endsWith('.md'));

        for (const skillFile of skillFiles) {
            const skillPath = join(categoryPath, skillFile);

            try {
                const content = readFileSync(skillPath, 'utf-8');
                const { metadata, body } = parseFrontmatter(content);
                const commands = extractCommands(body);

                skills.push({
                    path: skillPath,
                    metadata,
                    content: body,
                    commands
                });
            } catch (error) {
                console.error(`Error loading skill ${skillPath}:`, error);
            }
        }
    }

    return skills;
}

async function callOpenAI(prompt: string, skills: Skill[]): Promise<AgentResponse> {
    const skillList = skills.map(s =>
        `- **${s.metadata.name}**: ${s.metadata.description}\n  Commands: ${s.commands.slice(0, 3).join(', ')}`
    ).join('\n');

    const systemPrompt = `You are an AI agent that selects the appropriate skill based on user input.
Available skills:
${skillList}

Instructions:
1. Analyze the user's request
2. Select the most appropriate skill
3. Extract the specific command to execute from the skill
4. Provide your reasoning

Respond in JSON format:
{
    "skillName": "name of selected skill",
    "command": "command to execute",
    "reasoning": "why this skill and command"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'demo-key'}`
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log('OpenAI API error (using mock response):', errorText);

        return mockAgentResponse(prompt, skills);
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const content = data.choices[0]?.message?.content || '{}';

    try {
        return JSON.parse(content) as AgentResponse;
    } catch {
        return mockAgentResponse(prompt, skills);
    }
}

function mockAgentResponse(userPrompt: string, skills: Skill[]): AgentResponse {
    const promptLower = userPrompt.toLowerCase();

    for (const skill of skills) {
        const skillContent = (skill.metadata.description + ' ' + skill.content).toLowerCase();

        if (promptLower.includes('obsidian') || promptLower.includes('note') || promptLower.includes('vault')) {
            if (skill.metadata.name === 'obsidian') {
                let command = 'obsidian-cli search "query"';

                if (promptLower.includes('create') || promptLower.includes('new')) {
                    command = 'obsidian-cli create "Folder/New note" --open';
                } else                 if (promptLower.includes('search')) {
                    const match = promptLower.match(/search\s+["']?([^"']+)["']?/);
                    const searchQuery = match?.[1] || 'query';
                    command = `obsidian-cli search "${searchQuery}"`;
                } else if (promptLower.includes('default') || promptLower.includes('path')) {
                    command = 'obsidian-cli print-default --path-only';
                }

                return {
                    skillName: skill.metadata.name,
                    command,
                    reasoning: `Selected 'obsidian' skill because user mentioned Obsidian/vault/notes. Command '${command}' best matches the request.`
                };
            }
        }
    }

    return {
        skillName: skills[0]?.metadata?.name || 'unknown',
        command: skills[0]?.commands[0] || 'echo "No command found"',
        reasoning: 'Default fallback: no specific skill matched'
    };
}

async function executeCommand(command: string): Promise<void> {
    console.log(`\n🤖 Executing command: ${command}`);
    console.log('─'.repeat(50));

    try {
        const { execSync } = await import('child_process');
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error('Command execution failed:', error);
    }
}

async function runDemo(): Promise<void> {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║     AI Skill Agent Demo - OpenAI Protocol      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📂 Loading skills from:', SKILLS_DIR);
    const skills = loadSkills();
    console.log(`✅ Loaded ${skills.length} skill(s)\n`);

    for (const skill of skills) {
        console.log(`  • ${skill.metadata.name}: ${skill.metadata.description}`);
        console.log(`    Commands: ${skill.commands.slice(0, 2).join(', ')}${skill.commands.length > 2 ? '...' : ''}`);
    }

    console.log('\n' + '─'.repeat(50));

    const testPrompts = [
        'Search for notes about "meeting" in my Obsidian vault',
        'Create a new note called "Daily Log" in Obsidian',
        'What is the default Obsidian vault path?',
        'Search for "project" in Obsidian'
    ];

    for (let i = 0; i < testPrompts.length; i++) {
        const prompt = testPrompts[i]!;
        console.log(`\n👤 User Input #${i + 1}:`);
        console.log(`   "${prompt}"\n`);

        const response = await callOpenAI(prompt, skills);

        console.log('🧠 AI Decision:');
        console.log(`   Skill: ${response.skillName}`);
        console.log(`   Command: ${response.command}`);
        console.log(`   Reasoning: ${response.reasoning}`);

        await executeCommand(response.command);

        console.log('\n' + '─'.repeat(50));
    }

    console.log('\n✨ Demo complete!');
}

runDemo().catch(console.error);

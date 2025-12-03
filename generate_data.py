import discord
import json
import datetime
import asyncio

# ================= CONFIGURATION =================
TOKEN = 'INSERT TOKEN HERE'
GUILD_ID = 454492770682404875

CHANNEL_MAP = {
    "general": 454492770682404877,
    "cowboy-thoughts": 538641451211292673,
    "stream-archive": 1077821285566001252,
    "antisocial-book-club": 1318834323163447337,
    "jelley-events": 1063742740766134322,
    "🚜-tractor-hands": 902348468302020628,
    "tft-containment": 924833852030062694,
    "valorant": 827391154655461376,
    # "howdy-gacha-dungo": 1246227919043428455,
    "arom-stats": 933087762557579365,
    "mlee-pocket-ride": 1114109093171437648,
    "phrecia-enjoyers": 1311195432545812491,
    "ptcgp": 1345227643406123101,
    "howdy-chat": 648376150447357962,
    "sussy-hours": 822283830396059650,
    "frick-rankings": 827401801383936041,
    "weeb-zone": 922674739892338728,
    "game-recs": 833083167081758801,
    "defendant-donald": 1151786645536903309,
    "t": 1299504661585203292,
    "lost-ark": 941068107009650738
}

# Rank roles (highest to lowest)
RANK_ORDER = ["Sheriff", "Pardner", "Marshal", "Wrangler", "Rustler", "Drifter", "Buckaroo", "Greenhorn", "Outlaw"] 
# Roles that act as clues
CLUE_ROLES = ["seattleite", "Rat Gang", "tft", "variety gamers?", "tractor?", "arom?", "val?", "lost arknights", "boomer shooters", "jelley-events", "qb-dungeoneers", "exiles", "PTCGP", "readers", "riot-games"]
# =================================================

intents = discord.Intents.default()
intents.members = True
intents.message_content = True
client = discord.Client(intents=intents)

data = {
    "meta": {
        "guild_id": str(GUILD_ID),
        "generated_at": str(datetime.datetime.now())
    },
    "users": {},
    "messages": []
}

# Set to track duplicate content
seen_content = set()

def get_rank(member):
    member_role_names = [r.name for r in member.roles]
    for i, rank_name in enumerate(RANK_ORDER):
        if rank_name in member_role_names:
            return i
    return 999

def get_clue_roles(member):
    return [r.name for r in member.roles if r.name in CLUE_ROLES]

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')
    guild = client.get_guild(GUILD_ID)
    
    if not guild:
        print("Guild not found! Check ID.")
        await client.close()
        return

    print("Scraping Members (Initial Pass)...")
    for member in guild.members:
        if member.bot: continue
        
        real_username = member.name
        display_name = member.global_name if member.global_name else member.name
        nickname = member.nick if member.nick else display_name

        data["users"][str(member.id)] = {
            "id": str(member.id),
            "username": real_username,
            "display_name": display_name,
            "nickname": nickname,
            "avatar": member.display_avatar.url,
            "rank_val": get_rank(member),
            "clues": get_clue_roles(member),
            "joined_at": member.joined_at.timestamp() if member.joined_at else 0,
            "name_len": len(display_name)
        }

    print("Scraping Messages...")
    
    for name, channel_id in CHANNEL_MAP.items():
        channel = client.get_channel(channel_id)
        if not channel: 
            print(f"Could not find channel: {name} ({channel_id})")
            continue
        
        print(f" -> Scraping #{channel.name} ({name})...")
        
        count = 0
        try:
            async for msg in channel.history(limit=None):
                # throttle to avoid rate limits
                await asyncio.sleep(0.02) 

                if msg.author.bot: continue
                if str(msg.author.id) not in data["users"]: continue

                # If this message is older than the user's stored "joined_at",
                # update the user's joined_at to this message's timestamp.
                msg_ts = msg.created_at.timestamp()
                current_join_ts = data["users"][str(msg.author.id)]["joined_at"]
                if msg_ts < current_join_ts:
                    data["users"][str(msg.author.id)]["joined_at"] = msg_ts

                # Content logic
                content_type = "text"
                content = msg.content
                
                if msg.attachments:
                    content_type = "image"
                    content = msg.attachments[0].url
                elif not msg.content:
                    continue 

                # Filter short messages
                if content_type == "text" and len(content.split()) < 7:
                    continue
                
                # dedupe
                if content in seen_content:
                    continue
                seen_content.add(content)

                data["messages"].append({
                    "author_id": str(msg.author.id),
                    "type": content_type,
                    "content": content,
                    "msg_id": str(msg.id),
                    "channel_id": str(msg.channel.id)
                })

                count += 1
                if count % 1000 == 0:
                    print(f"    ...scraped {count} msgs in {name}")
        except Exception as e:
            print(f"Error scraping {name}: {e}")
            print("!!! Skipping remaining messages in this channel to save progress.")

    # Save to JSON
    with open('public/game_data.json', 'w') as f:
        json.dump(data, f)
    
    print(f"Done! Saved {len(data['users'])} users and {len(data['messages'])} unique messages.")
    await client.close()

client.run(TOKEN)
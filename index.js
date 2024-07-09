const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, AudioPlayerStatus } = require('@discordjs/voice');
const { token, clientId, guildId } = require('./config.json');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

const player = createAudioPlayer();

client.once('ready', () => {
    console.log('Bot is online!');
});

// Register slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Joins the voice channel you are in'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Leaves the voice channel'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'join') {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply('You need to be in a voice channel to use this command.');
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
		
		const resource_connected = createAudioResource(path.join(__dirname, 'sounds', 'connected.mp3'));
        player.play(resource_connected);
		connection.subscribe(player); 
        await interaction.reply(`Joined the voice channel: ${channel.name}`);
    } else if (commandName === 'leave') {
        const channel = interaction.member.voice.channel;
        if (!channel) {
            return interaction.reply('You need to be in a voice channel to use this command.');
        }

        const connection = getVoiceConnection(channel.guild.id);
        if (connection) {
			const resource_disconnected = createAudioResource(path.join(__dirname, 'sounds', 'disconnected.mp3'));
            player.play(resource_disconnected);
			connection.subscribe(player); 
			await new Promise(resolve => setTimeout(resolve, 2000))
            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });
            await interaction.reply(`Leaving the voice channel: ${channel.name}`);
        } else {
            await interaction.reply('Not connected to any voice channel.');
        }
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const channel = newState.channel || oldState.channel;
    const connection = getVoiceConnection(channel.guild.id);

    if (!connection) return;

    if (newState.channelId && !oldState.channelId) {
		const resource_connected = createAudioResource(path.join(__dirname, 'sounds', 'connected.mp3'));
        player.play(resource_connected);
		connection.subscribe(player); 
    } else if (!newState.channelId && oldState.channelId) {
		const resource_disconnected = createAudioResource(path.join(__dirname, 'sounds', 'disconnected.mp3'));
        player.play(resource_disconnected);
		connection.subscribe(player); 
    } else if (!oldState.selfDeaf && newState.selfDeaf) {
		const resource_soundmuted = createAudioResource(path.join(__dirname, 'sounds', 'soundmuted.mp3'));
        player.play(resource_soundmuted);
		connection.subscribe(player); 
    } else if (oldState.selfDeaf && !newState.selfDeaf) {
		const resource_soundresume = createAudioResource(path.join(__dirname, 'sounds', 'soundresume.mp3'));
        player.play(resource_soundresume);
		connection.subscribe(player); 
    } else if (!oldState.selfMute && newState.selfMute) {
		const resource_micmute = createAudioResource(path.join(__dirname, 'sounds', 'micmute.mp3'));
        player.play(resource_micmute);
		connection.subscribe(player); 
    } else if (oldState.selfMute && !newState.selfMute) {
		const resource_micact = createAudioResource(path.join(__dirname, 'sounds', 'micact.mp3'));
        player.play(resource_micact);
		connection.subscribe(player); 
    } 
});

// Handle clean shutdown
const cleanShutdown = () => {
    console.log('Shutting down gracefully...');
    client.guilds.cache.forEach(guild => {
        const connection = getVoiceConnection(guild.id);
        if (connection) connection.destroy();
    });
    client.destroy();
};

const shutdownDelay = async () => {
	await new Promise(resolve => setTimeout(resolve, 1000))
	process.exit();
}

process.on('SIGINT', cleanShutdown);
process.on('SIGTERM', cleanShutdown);

client.login(token);
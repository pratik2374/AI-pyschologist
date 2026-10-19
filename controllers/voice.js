const { AccessToken } = require('livekit-server-sdk');
const User = require('../models/User');

/**
 * POST /api/v1/voice/token
 *
 * Generates an authorized LiveKit room token (JWT) for the authenticated user.
 * Each user is assigned their own private room so the Dr. Aria Voice Agent
 * can converse in a secure, confidential environment.
 */
exports.getVoiceToken = async (req, res) => {
    try {
        const userId = req.decoded?.userid;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User ID not found in token'
            });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !livekitUrl) {
            return res.status(500).json({
                success: false,
                message: 'LiveKit credentials are not configured on the server'
            });
        }

        // Fetch user's preferred name or fallback
        const user = await User.findById(userId).select('preferredName name encryptionMode').lean();
        const participantIdentity = `user_${userId}`;
        const participantName = user?.preferredName || user?.name || 'Client';
        const roomName = `room_${userId}`;

        // Create LiveKit access token with 2-hour TTL
        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantIdentity,
            name: participantName,
            ttl: '2h',
            metadata: JSON.stringify({
                userId: userId.toString(),
                preferredName: participantName,
                encryptionMode: user?.encryptionMode || 'A'
            })
        });

        // Grant permissions to join the dedicated therapy room
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true
        });

        const token = await at.toJwt();

        return res.status(200).json({
            success: true,
            token,
            roomName,
            url: livekitUrl,
            participantName
        });

    } catch (err) {
        console.error('[LiveKit] Error generating voice token:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate voice session token'
        });
    }
};

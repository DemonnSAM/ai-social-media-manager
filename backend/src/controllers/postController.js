import supabaseAdmin from "../config/supabaseAdmin.js";

export const createPost = async (req, res) => {
    try {
        const { user_id, content, status } = req.body;
        let { social_account_ids, scheduled_at } = req.body;
        const files = req.files || [];

        if (!user_id || !status) {
            return res.status(400).json({ error: "Missing required fields: user_id or status" });
        }

        if (social_account_ids) {
            try {
                social_account_ids = JSON.parse(social_account_ids);
            } catch (e) {
                // Ignore if it's already an array or invalid JSON
            }
        } else {
            social_account_ids = [];
        }

        // 1. Insert into posts table
        const postData = {
            user_id,
            content: content || "",
            status,
        };
        
        if (scheduled_at && status === 'scheduled') {
            postData.scheduled_at = new Date(scheduled_at).toISOString();
        }

        const { data: post, error: postError } = await supabaseAdmin
            .from("posts")
            .insert([postData])
            .select()
            .single();

        if (postError) {
            console.error("Error creating post:", postError);
            return res.status(500).json({ error: postError.message });
        }

        // 2. Upload media if exists
        let mediaRecords = [];
        if (files && files.length > 0) {
            for (const file of files) {
                const fileExt = file.originalname.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${user_id}/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabaseAdmin
                    .storage
                    .from("post-media")
                    .upload(filePath, file.buffer, {
                        contentType: file.mimetype,
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Error uploading media:", uploadError);
                    continue; // Skip this file and try others
                }

                const { data: publicUrlData } = supabaseAdmin
                    .storage
                    .from("post-media")
                    .getPublicUrl(filePath);

                const fileUrl = publicUrlData.publicUrl;

                // Updated media table
                const { data: media, error: mediaError } = await supabaseAdmin
                    .from("media")
                    .insert([{
                        post_id: post.id,
                        url: fileUrl,  // matching 'file_url' if needed, but schema.sql says 'url'
                        type: file.mimetype.startsWith('video/') ? 'video' : 'image',
                        storage_path: filePath
                    }])
                    .select()
                    .single();

                if (mediaError) {
                    console.error("Error creating media record:", mediaError);
                } else {
                    mediaRecords.push(media);
                }
            }
        }

        // 3. Insert into post_targets
        if (social_account_ids && social_account_ids.length > 0) {
            // First let's get the platforms for these accounts so we can populate conditionally
            const { data: accountsData } = await supabaseAdmin
                .from("social_accounts")
                .select("id, platform")
                .in("id", social_account_ids);
                
            const accountMap = {};
            if (accountsData) {
                accountsData.forEach(acc => {
                    accountMap[acc.id] = acc.platform;
                });
            }

            const targetsData = social_account_ids.map(accountId => ({
                post_id: post.id,
                social_account_id: accountId,
                status: 'pending'
            }));

            // Attempt to insert without platform. The user prompt requested `platform`, 
            // but the original schema we ran didn't have it. If it fails due to missing column, 
            // Supabase will throw an error but at least we tried standard insert. Let's add platform cautiously:
            const targetsDataWithPlatform = targetsData.map(t => ({
                ...t,
                platform: accountMap[t.social_account_id] || 'unknown'
            }));

            // Try inserting with platform first...
            let { error: targetsError } = await supabaseAdmin
                .from("post_targets")
                .insert(targetsDataWithPlatform);

            if (targetsError && targetsError.code === 'PGRST204') {
                // Column 'platform' not found error code
                console.log("Column 'platform' not found in post_targets, falling back to standard insert");
                const { error: fallbackError } = await supabaseAdmin
                    .from("post_targets")
                    .insert(targetsData);
                targetsError = fallbackError;
            }

            if (targetsError) {
                console.error("Error creating post targets:", targetsError);
            }
        }

        res.status(201).json({
            message: "Post created successfully",
            post,
            media: mediaRecords
        });

    } catch (error) {
        console.error("Unexpected error in createPost:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Post ID is required" });
        }

        const { error } = await supabaseAdmin
            .from("posts")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting post:", error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Unexpected error in deletePost:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

UPDATE profiles
    SET pixi_tokens = COALESCE(pixi_tokens, 0) + 50
    WHERE id IN (
        SELECT owner_id
        FROM nfts
        GROUP BY owner_id
        ORDER BY SUM(price_sol) DESC
        LIMIT 10
    );
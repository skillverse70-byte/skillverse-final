import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkCheck } from "lucide-react";

export default function BookmarkButton({
  itemType,
  itemId,
  itemTitle,
  itemSubtitle,
  itemCategory,
  className,
}) {
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const me = await appClient.auth.me();
        setUserId(me.id);
        const items = await appClient.entities.SavedItem.filter({
          user_id: me.id,
          item_type: itemType,
          item_id: itemId,
        });
        if (items.length > 0) {
          setSaved(true);
          setSavedId(items[0].id);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    check();
  }, [itemType, itemId]);

  const toggle = async () => {
    if (saved) {
      await appClient.entities.SavedItem.delete(savedId);
      setSaved(false);
      setSavedId(null);
    } else {
      const item = await appClient.entities.SavedItem.create({
        user_id: userId,
        item_type: itemType,
        item_id: itemId,
        item_title: itemTitle,
        item_subtitle: itemSubtitle,
        item_category: itemCategory,
      });
      setSaved(true);
      setSavedId(item.id);
    }
  };

  if (loading) return null;

  return (
    <Button
      variant={saved ? "default" : "outline"}
      onClick={toggle}
      className={`${saved ? "bg-teal-600 hover:bg-teal-700 gap-2" : "gap-2"} ${className || ""}`}
    >
      {saved ? (
        <BookmarkCheck className="w-4 h-4" />
      ) : (
        <Bookmark className="w-4 h-4" />
      )}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

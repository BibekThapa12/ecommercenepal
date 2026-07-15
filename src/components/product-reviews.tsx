import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  user_id: string;
  status: string;
  profiles: { full_name: string | null } | null;
};

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const reviewsQ = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select("id, rating, title, body, created_at, user_id, status, profiles:user_id(full_name)")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });

  const verifiedQ = useQuery({
    queryKey: ["review-verified", productId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, orders!inner(user_id, status)")
        .eq("product_id", productId)
        .eq("orders.user_id", user!.id)
        .in("orders.status", ["delivered", "shipped", "out_for_delivery"])
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  });

  const myReviewQ = useQuery({
    queryKey: ["my-review", productId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to review");
      if (!body.trim()) throw new Error("Write a short review");
      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        body: body.trim(),
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted for moderation");
      setBody(""); setTitle(""); setRating(5);
      qc.invalidateQueries({ queryKey: ["my-review", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviews = reviewsQ.data ?? [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const canReview = !!user && verifiedQ.data && !myReviewQ.data;

  return (
    <section className="mt-16 border-t pt-12">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-display text-3xl font-bold">Customer reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-4 w-4", i < Math.round(avg) ? "fill-gold text-gold" : "text-muted")} />
                ))}
              </div>
              <span>{avg.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">
          {reviewsQ.isLoading ? (
            <div className="h-32 rounded-xl bg-muted animate-pulse" />
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="rounded-xl border p-4 bg-card">
                <header className="flex items-center gap-2 mb-1">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-gold text-gold" : "text-muted")} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.profiles?.full_name ?? "Customer"}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                </header>
                {r.title && <h3 className="font-semibold mt-1">{r.title}</h3>}
                {r.body && <p className="text-sm mt-1 text-muted-foreground leading-relaxed">{r.body}</p>}
              </article>
            ))
          )}
        </div>

        <aside className="rounded-2xl border bg-card p-5 h-fit">
          <h3 className="font-display text-lg font-semibold">Write a review</h3>
          {!user ? (
            <p className="text-sm text-muted-foreground mt-2">Sign in to leave a review.</p>
          ) : !verifiedQ.data ? (
            <p className="text-sm text-muted-foreground mt-2">Only verified purchasers can review this product.</p>
          ) : myReviewQ.data ? (
            <p className="text-sm text-muted-foreground mt-2">You already reviewed this product. Thanks!</p>
          ) : (
            <div className="space-y-3 mt-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Rating</div>
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button key={i} type="button" onClick={() => setRating(i + 1)}>
                      <Star className={cn("h-6 w-6", i < rating ? "fill-gold text-gold" : "text-muted")} />
                    </button>
                  ))}
                </div>
              </div>
              <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} placeholder="Headline (optional)" />
              <Textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 1000))} placeholder="Share what you liked or didn't." rows={4} />
              <Button className="w-full" disabled={submit.isPending || !canReview} onClick={() => submit.mutate()}>
                {submit.isPending ? "Submitting…" : "Submit review"}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

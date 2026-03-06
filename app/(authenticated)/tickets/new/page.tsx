"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewTicketPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  // TODO: React.FormEvent is deprecated, replace with correct handler type (Check if React.SubmitEvent or similar is available in your React version)
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST to /api/tickets
    console.log("Create ticket:", { title, message });
    router.push("/tickets");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Ticket</h1>
        <p className="text-muted-foreground">
          Describe your issue and we&apos;ll get back to you
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a Support Ticket</CardTitle>
          <CardDescription>
            Fill in the details below. Title: 5–80 characters. Message: 1–2000
            characters.
          </CardDescription>
        </CardHeader>
        {/* TODO: Add form validation and error handling, ensure malicious input is prevented */}
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief summary of your issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                minLength={5}
                maxLength={80}
                required
              />
              <p className="text-xs text-muted-foreground">{title.length}/80</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Initial Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your issue in detail..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                rows={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                {message.length}/2000
              </p>
            </div>

            <div className="flex gap-3">
              <Button type="submit">Submit Ticket</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/tickets")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

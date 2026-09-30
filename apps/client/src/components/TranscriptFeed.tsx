import React, { useEffect, useRef, useState } from "react";
import { UserIcon, BotIcon, CopyIcon, CheckIcon, RadioIcon } from "./Icons";
import { ChatMsg } from "../hooks/useAgentSession";

interface TranscriptFeedProps {
    messages: ChatMsg[];
    onClear?: () => void;
}

export function TranscriptFeed({ messages, onClear }: TranscriptFeedProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleCopy = () => {
        if (messages.length === 0) return;
        const text = messages
            .map((m) => `[${m.role === "user" ? "Worker" : "SiteSpeak AI"}]: ${m.text}`)
            .join("\n");
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="glass-card" id="transcript-container">
            <div className="glass-card-header">
                <div className="card-title-group">
                    <RadioIcon size={18} style={{ color: "var(--accent-cyan)" }} />
                    <h2 className="card-title">Live Audio Transcript</h2>
                    <span className="card-badge">{messages.length} messages</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    {messages.length > 0 && (
                        <>
                            <button
                                className="action-btn-sm"
                                onClick={handleCopy}
                                title="Copy full transcript"
                            >
                                {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
                                <span>{copied ? "Copied" : "Copy"}</span>
                            </button>
                            {onClear && (
                                <button
                                    className="action-btn-sm"
                                    onClick={onClear}
                                    title="Clear transcript"
                                >
                                    <span>Clear</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="glass-card-body">
                <div className="transcript-box">
                    {messages.length === 0 ? (
                        <div className="transcript-empty">
                            <div className="transcript-empty-icon">
                                <RadioIcon size={24} />
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                                No speech captured yet
                            </h3>
                            <p style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.5 }}>
                                Tap <strong>Start Voice Report</strong> above and speak naturally.
                                Your words and the AI responses will stream here in real time.
                            </p>
                        </div>
                    ) : (
                        messages.map((m, idx) => {
                            const isUser = m.role === "user";
                            return (
                                <div key={idx} className="chat-bubble">
                                    <div
                                        className={`avatar-badge ${
                                            isUser ? "avatar-worker" : "avatar-agent"
                                        }`}
                                    >
                                        {isUser ? <UserIcon size={16} /> : <BotIcon size={16} />}
                                    </div>
                                    <div
                                        className={`bubble-content ${
                                            isUser ? "bubble-worker" : "bubble-agent"
                                        }`}
                                    >
                                        <div className="bubble-header">
                                            <span
                                                className="speaker-name"
                                                style={{ color: isUser ? "var(--accent-cyan)" : "#cbd5e1" }}
                                            >
                                                {isUser ? "Field Worker" : "SiteSpeak AI"}
                                            </span>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {!m.final && (
                                                    <span className="speaker-status">speaking…</span>
                                                )}
                                                {m.timestamp && (
                                                    <span style={{ fontSize: 10, color: "var(--text-dim)" }}>
                                                        {m.timestamp}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bubble-text">{m.text}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>
        </div>
    );
}

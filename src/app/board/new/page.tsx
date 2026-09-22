'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Loader2,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Bug,
  Megaphone,
  CheckCircle2,
} from 'lucide-react';
import AuthModal from '@/components/board/AuthModal';

export default function NewThreadPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const [catRes, meRes] = await Promise.all([
        fetch('/api/board/categories'),
        fetch('/api/auth/me'),
      ]);

      const catData = await catRes.json();
      const meData = await meRes.json();

      if (catData.categories) {
        setCategories(catData.categories);
        // Default to suggestion category if exists
        const defaultCat =
          catData.categories.find((c: any) => c.slug === 'suggestion') || catData.categories[0];
        if (defaultCat) setSelectedCategoryId(defaultCat.id);
      }

      if (meData?.user) {
        setCurrentUser(meData.user);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }

    if (!selectedCategoryId) {
      setError('กรุณาเลือกหมวดหมู่กระทู้');
      return;
    }

    if (title.trim().length < 5) {
      setError('หัวข้อกระทู้ต้องมีความยาวอย่างน้อย 5 ตัวอักษร');
      return;
    }

    if (body.trim().length < 10) {
      setError('เนื้อหากระทู้ต้องมีความยาวอย่างน้อย 10 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/board/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          title: title.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างกระทู้');

      router.push(`/board/thread/${data.thread.id}`);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  const categoryIcons: Record<string, any> = {
    suggestion: Lightbulb,
    community: MessageSquare,
    feedback: Bug,
    announcement: Megaphone,
  };

  if (initialLoading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-xs text-slate-400">กำลังเตรียมฟอร์ม...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Back Button */}
      <Link
        href="/board"
        className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>ยกเลิกและกลับไปหน้ารวมกระทู้</span>
      </Link>

      {/* Main Form Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-orange-500/10 text-orange-400 border border-orange-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>สร้างกระทู้ใหม่ในชุมชน</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            เสนอแนะฟีเจอร์ หรือเปิดประเด็นพูดคุย
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            ร่วมแชร์ไอเดียเพื่อให้ทีมงานนำไปพัฒนาต่อยอด หรือแลกเปลี่ยนประสบการณ์กับเพื่อนๆ ร้านอาหาร
          </p>
        </div>

        {/* Not logged in warning */}
        {!currentUser && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200 text-xs">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>คุณยังไม่ได้เข้าสู่ระบบ ข้อความร่างของคุณจะถูกเก็บไว้ กรุณาเข้าสู่ระบบก่อนกดส่งกระทู้</span>
            </div>
            <button
              type="button"
              onClick={() => setAuthModalOpen(true)}
              className="py-1.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shrink-0 transition-all cursor-pointer"
            >
              เข้าสู่ระบบทันที
            </button>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Select */}
          <div>
            <label className="block text-xs font-black text-slate-300 mb-2">
              เลือกหมวดหมู่กระทู้ *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories
                .filter((cat) => cat.slug !== 'announcement' || currentUser?.role === 'SUPER_ADMIN')
                .map((cat) => {
                  const Icon = categoryIcons[cat.slug] || MessageSquare;
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start space-x-3 cursor-pointer select-none ${
                        isSelected
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black leading-snug">{cat.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-300">
                หัวข้อกระทู้ *
              </label>
              <span className="text-[10px] text-slate-500">
                {title.length}/100 ตัวอักษร
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น อยากให้มีระบบแยกบิลโต๊ะเดียวกัน หรือ เทคนิคการจัดเตรียมวัตถุดิบช่วงเที่ยง"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Body Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-300">
                รายละเอียดเนื้อหา *
              </label>
              <span className="text-[10px] text-slate-500">
                อย่างน้อย 10 ตัวอักษร
              </span>
            </div>
            <textarea
              required
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="อธิบายเหตุผล ประโยชน์ที่จะได้รับ หรือขั้นตอนที่อยากให้ระบบทำได้ เพื่อให้ทีมงานและเพื่อนๆ ร้านอาหารเข้าใจได้ชัดเจนยิ่งขึ้น..."
              className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none leading-relaxed"
            />
          </div>

          {/* Posting Guidelines */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <span className="font-bold text-slate-300 block">💡 ข้อแนะนำในการตั้งกระทู้:</span>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>ใช้คำสุภาพ เป็นมิตร และให้เกียรติซึ่งกันและกัน</li>
              <li>หากเป็นข้อเสนอแนะฟีเจอร์ ระบุตัวอย่างการใช้งานจริงเพื่อประโยชน์สูงสุด</li>
              <li>จำกัดการตั้งกระทู้ไม่เกิน 3 กระทู้ต่อชั่วโมงเพื่อป้องกันสแปม</li>
            </ul>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <Link
              href="/board"
              className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/25 flex items-center space-x-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเผยแพร่...</span>
                </>
              ) : (
                <>
                  <span>เผยแพร่กระทู้</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Auth Modal Trigger */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(u) => {
          setCurrentUser(u);
        }}
        title="เข้าสู่ระบบเพื่อเผยแพร่กระทู้"
        subtitle="เข้าสู่ระบบหรือสมัครเปิดร้าน เพื่อให้กระทู้ของคุณถูกเผยแพร่ในชุมชน"
      />
    </div>
  );
}

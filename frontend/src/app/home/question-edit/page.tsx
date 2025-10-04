'use client'

import QuestionForm1 from "@/components/ui/home/question_bank/QuestionForm1"

export default function Page() {
    return (
        <div className="flex flex-col gap-y-6">
            <h1>Question Editor</h1>
            <QuestionForm1 />
        </div>
    )
}
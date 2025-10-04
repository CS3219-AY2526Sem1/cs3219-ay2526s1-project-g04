"use client"

import React, { useState } from "react";
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

const DIFFICULTY = ['Easy', 'Medium', 'Hard'];

export default function QuestionForm() {
    const [title, setTitle] = useState("");
    const [difficulty, setDifficulty] = useState("");
    const [topics, setTopics] = useState<string[]>([]);
    const [body, setBody] = useState("");

    return (
        <form>
            <div className='grid grid-cols-1 gap-y-5'>
                {/* Title */}
                {/* <div className='grid grid-cols-1 gap-y-2'>
                    <label className="text-xl font-semibold text-[var(--foreground)]">Question Title</label>
                    <input
                        type='text'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                        placeholder="Enter Question Title"
                        required
                    />
                </div> */}

                <TextField
                    required
                    id="question-title"
                    label="Question Title"
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Difficulty and Topic */}
                <div className='grid grid-cols-2 gap-x-5 gap-y-2'>
                    {/* Difficulty */}
                    {/* <div className='grid grid-cols-1 gap-y-2'>
                        <label className="text-xl font-semibold text-[var(--foreground)]">Difficulty</label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                            required
                        >
                            <option value="">Select difficulty</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div> */}

                    <Select
                        required
                        labelId="difficulty-label"
                        id='difficulty'
                        value={difficulty}
                        label="Difficulty"
                        onChange={(e) => setDifficulty(e.target.value)}
                        displayEmpty
                    >
                        <MenuItem value="" disabled>
                            Select difficulty
                        </MenuItem>
                        {DIFFICULTY.map((difficultyLevel) => (
                            <MenuItem
                                key={difficultyLevel}
                                value={difficultyLevel}
                            >
                                {difficultyLevel}
                            </MenuItem>
                        ))}
                    </Select>

                    {/* Topic */}
                    {/* <div className='grid grid-cols-1 gap-y-2'>
                        <label className="text-xl font-semibold text-[var(--foreground)]">Topics</label>
                        <select
                            multiple
                            value={topics}
                            onChange={(e) =>
                                setTopics(Array.from(e.target.selectedOptions, (opt) => opt.value))
                            }
                            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                            required
                        >
                            <option value="arrays">Arrays</option>
                            <option value="dp">Dynamic Programming</option>
                            <option value="graphs">Graphs</option>
                            <option value="math">Math</option>
                        </select>
                    </div> */}

                </div>
            </div>
        </form>
    );
};
"use client";

import { useState, use, useEffect } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";

import Agent from "@/components/Agent";
import { getRandomInterviewCover } from "@/lib/utils";
import DisplayTechIcons from "@/components/DisplayTechIcons";
import { getInterviewById } from "@/lib/actions/general.action";

const InterviewPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const resolvedParams = use(params);
  const [selectedOption, setSelectedOption] = useState<
    "immediate" | "call" | null
  >(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [position, setPosition] = useState<string>("");

  // Dummy user data
  const dummyUser = {
    id: "demo-user",
    name: "Demo User",
    email: "demo@example.com",
  };

  // Get user name and interview data from localStorage using interview ID
  const [userName, setUserName] = useState<string>("Demo User");
  useEffect(() => {
    const fetchData = async () => {
      if (typeof window !== "undefined" && resolvedParams?.id) {
        // Get user name
        const storedName = localStorage.getItem(
          `interview_user_name_${resolvedParams.id}`
        );
        if (storedName) setUserName(storedName);

        // Get position from localStorage
        const storedPosition = localStorage.getItem(
          `interview_position_${resolvedParams.id}`
        );
        if (storedPosition) {
          setPosition(storedPosition);
        } else {
          // Fallback to getting from interview data
          try {
            const interview = await getInterviewById(resolvedParams.id);
            if (interview) {
              setPosition(interview.role);
            }
          } catch (error) {
            console.error("Error fetching interview:", error);
          }
        }
      }
    };

    fetchData();
  }, [resolvedParams?.id]);

  const handleOptionSelect = (option: "immediate" | "call") => {
    if (option === "call") {
      setShowPhoneInput(true);
    } else {
      setSelectedOption(option);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber) {
      try {
        setIsCalling(true);
        setCallError(null);

        // Ensure phone number is in E.164 format
        const formattedNumber = phoneNumber.startsWith("+")
          ? phoneNumber
          : `+${phoneNumber}`;

        const response = await fetch("/api/call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: formattedNumber,
            userName: userName,
            userId: dummyUser.id,
            interviewId: resolvedParams.id,
            position: position,
            type: "outboundPhoneCall",
            assistant: {
              name: "Interview Assistant",
              firstMessage: `Hello ${userName}! I'm your AI interviewer for the ${position} position. Are you ready to begin the interview?`,
              voice: {
                provider: "azure",
                voiceId: "andrew",
              },
              model: {
                provider: "anthropic",
                model: "claude-3-opus-20240229",
              },
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to initiate call");
        }

        // Show calling message for 5 seconds
        setTimeout(() => {
          setIsCalling(false);
          setShowPhoneInput(false);
          setPhoneNumber("");
        }, 5000);
      } catch (error) {
        setCallError(
          error instanceof Error ? error.message : "Failed to initiate call"
        );
        setIsCalling(false);
      }
    }
  };

  if (isCalling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Calling you...</h2>
          <p className="text-gray-600">
            Please wait while we connect your call.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedOption) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-3xl font-bold mb-8">Choose Interview Type</h1>
        {!showPhoneInput ? (
          <div className="space-y-4 w-full max-w-md">
            <button
              onClick={() => handleOptionSelect("immediate")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Start Immediate Interview
            </button>
            <button
              onClick={() => handleOptionSelect("call")}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Call Me for Interview
            </button>
          </div>
        ) : (
          <form
            onSubmit={handlePhoneSubmit}
            className="w-full max-w-md space-y-4"
          >
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Enter your phone number
              </label>
              <input
                type="tel"
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {callError && (
                <p className="text-red-500 text-sm mt-1">{callError}</p>
              )}
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setShowPhoneInput(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                disabled={isCalling}
              >
                {isCalling ? "Calling..." : "Request Call"}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <Agent
      userName={userName}
      userId={dummyUser.id}
      interviewId={resolvedParams.id}
      type={selectedOption === "immediate" ? "interview" : "call"}
      phoneNumber={selectedOption === "call" ? phoneNumber : undefined}
      position={position}
    />
  );
};

export default InterviewPage;

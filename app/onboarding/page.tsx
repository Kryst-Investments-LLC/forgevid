"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Progress } from "@/components/ui/progress"
import {
  Sparkles,
  Users,
  Video,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Play,
  Target,
  Briefcase,
  GraduationCap,
  Heart,
  Megaphone,
} from "lucide-react"
import Link from "next/link"

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    role: "",
    goals: [] as string[],
    useCase: "",
    experience: "",
    interests: [] as string[],
  })

  const totalSteps = 5
  const progress = (currentStep / totalSteps) * 100

  const goals = [
    { id: "marketing", label: "Marketing Videos", icon: Megaphone },
    { id: "social", label: "Social Media Content", icon: Heart },
    { id: "training", label: "Training & Education", icon: GraduationCap },
    { id: "business", label: "Business Presentations", icon: Briefcase },
    { id: "personal", label: "Personal Projects", icon: Target },
  ]

  const useCases = [
    { id: "startup", label: "Startup/Small Business", description: "Growing your brand with video content" },
    { id: "agency", label: "Marketing Agency", description: "Creating content for multiple clients" },
    { id: "enterprise", label: "Enterprise", description: "Large-scale video production needs" },
    { id: "creator", label: "Content Creator", description: "Building your personal brand" },
    { id: "educator", label: "Educator/Trainer", description: "Teaching and training materials" },
  ]

  const handleGoalToggle = (goalId: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goalId) ? prev.goals.filter((g) => g !== goalId) : [...prev.goals, goalId],
    }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    // Save onboarding data and redirect to dashboard
    console.log("Onboarding completed:", formData)
    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold">ForgeVid</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to ForgeVid!</h1>
          <p className="text-slate-600">Let's personalize your experience</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-600 mb-2">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="mb-8">
          <CardContent className="p-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Tell us about yourself</h2>
                  <p className="text-slate-600">This helps us personalize your experience</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter your last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                    placeholder="Enter your company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g., Marketing Manager, Content Creator"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Goals */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">What are your video goals?</h2>
                  <p className="text-slate-600">Select all that apply to help us customize your experience</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {goals.map((goal) => (
                    <Card
                      key={goal.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        formData.goals.includes(goal.id) ? "ring-2 ring-primary bg-primary/5" : ""
                      }`}
                      onClick={() => handleGoalToggle(goal.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <goal.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <h3 className="font-semibold text-slate-900">{goal.label}</h3>
                        {formData.goals.includes(goal.id) && (
                          <CheckCircle className="h-5 w-5 text-primary mx-auto mt-2" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Use Case */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">What best describes you?</h2>
                  <p className="text-slate-600">This helps us tailor features to your needs</p>
                </div>

                <RadioGroup
                  value={formData.useCase}
                  onValueChange={(value: string) => setFormData((prev) => ({ ...prev, useCase: value }))}
                  className="space-y-4"
                >
                  {useCases.map((useCase) => (
                    <Card key={useCase.id} className="cursor-pointer hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value={useCase.id} id={useCase.id} />
                          <div className="flex-1">
                            <Label htmlFor={useCase.id} className="font-semibold cursor-pointer">
                              {useCase.label}
                            </Label>
                            <p className="text-sm text-slate-600 mt-1">{useCase.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Step 4: Experience Level */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">What's your video experience level?</h2>
                  <p className="text-slate-600">This helps us adjust our recommendations</p>
                </div>

                <RadioGroup
                  value={formData.experience}
                  onValueChange={(value: string) => setFormData((prev) => ({ ...prev, experience: value }))}
                  className="space-y-4"
                >
                  <Card className="cursor-pointer hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="beginner" id="beginner" />
                        <div>
                          <Label htmlFor="beginner" className="font-semibold cursor-pointer">
                            Beginner
                          </Label>
                          <p className="text-sm text-slate-600">New to video creation, need guidance</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="intermediate" id="intermediate" />
                        <div>
                          <Label htmlFor="intermediate" className="font-semibold cursor-pointer">
                            Intermediate
                          </Label>
                          <p className="text-sm text-slate-600">Some experience, comfortable with basics</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value="advanced" id="advanced" />
                        <div>
                          <Label htmlFor="advanced" className="font-semibold cursor-pointer">
                            Advanced
                          </Label>
                          <p className="text-sm text-slate-600">Experienced creator, want advanced features</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </RadioGroup>
              </div>
            )}

            {/* Step 5: Completion */}
            {currentStep === 5 && (
              <div className="space-y-6 text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h2>
                  <p className="text-slate-600">
                    We've personalized your experience based on your preferences
                  </p>
                </div>

                <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">What's next?</h3>
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </div>
                        <span className="text-sm">Explore your personalized dashboard</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          2
                        </div>
                        <span className="text-sm">Create your first AI-generated video</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                          3
                        </div>
                        <span className="text-sm">Invite team members to collaborate</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Video className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <h4 className="font-semibold text-sm">Watch Tutorial</h4>
                      <p className="text-xs text-slate-600">5-minute quick start guide</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                      <h4 className="font-semibold text-sm">Join Community</h4>
                      <p className="text-xs text-slate-600">Connect with other creators</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-slate-600">
                Skip for now
              </Button>
            </Link>

            {currentStep < totalSteps ? (
              <Button onClick={handleNext} className="flex items-center gap-2">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start Creating
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

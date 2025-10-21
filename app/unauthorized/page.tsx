import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access this resource. Contact your administrator if you believe this is an
            error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="space-y-2">
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/help">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from "react";
import type { FormEvent } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function Form() {
  const [responseMessage, setResponseMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // const formData = new FormData(e.target as HTMLFormElement);
    // const response = await fetch("/api/feedback", {
    //   method: "POST",
    //   body: formData,
    // });
    // const data = await response.json();
    // if (data.message) {
    //   setResponseMessage(data.message);
    // }
    // await fetch("/api/feedback", {
    //   method: "GET",
    // });
    document.location.href = "/api/auth/login/google";
  }
  return (
    <form onSubmit={submit}>
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Create project</CardTitle>
          <CardDescription>Deploy your new project in one-click.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" placeholder="Name of your project" />
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input type="email" id="email" name="email" placeholder="Your email" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Input type="text" id="message" name="message" placeholder="Your message" />
            </div>
          </div>

          {responseMessage && <p>{responseMessage}</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button type="submit">Deploy</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

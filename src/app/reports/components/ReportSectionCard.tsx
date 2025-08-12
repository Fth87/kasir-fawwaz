import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from 'react';

interface ReportSectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Optional className for CardContent
}

export function ReportSectionCard({ title, children, className }: ReportSectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-headline">{title}</CardTitle>
      </CardHeader>
      <CardContent className={className}>
        {children}
      </CardContent>
    </Card>
  );
}

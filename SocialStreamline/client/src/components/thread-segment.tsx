import { ThreadSegment } from "@shared/schema";
import { RichContentView } from "./ui/tiptap-editor";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface ThreadSegmentProps {
  segment: ThreadSegment;
  index: number;
  isLast: boolean;
}

export function ThreadSegmentComponent({ segment, index, isLast }: ThreadSegmentProps) {
  return (
    <div className="relative mb-8">
      {/* Connection line between segments */}
      {!isLast && (
        <div className="absolute left-8 top-[60px] bottom-0 w-0.5 bg-muted-foreground/30 -z-10" />
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            {/* Segment number bubble */}
            <div className="flex items-center mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                {index + 1}
              </div>
              <div className="ml-3 text-xs text-muted-foreground">
                {new Date(segment.createdAt).toLocaleDateString()} • 
                {index === 0 ? ' Opening' : isLast ? ' Conclusion' : ' Segment'}
              </div>
            </div>
            
            {/* Rich content */}
            <div className="mt-2">
              <RichContentView content={segment.content} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
